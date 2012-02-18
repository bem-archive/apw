var Q = require('qq');

function Jobs(plan, maxWorkers) {
    var J = this;

    J.maxWorkers = maxWorkers;
    J.activeWorkers = 0;
    J.plan = plan;
}

exports.newJobs = function(plan, maxWorkers) {
    return new Jobs(plan, maxWorkers || 4);
};

Jobs.prototype.start = function() {
    var J = this,
        plan = J.plan;

    J.defer = Q.defer();

    plan.rescanJobs();
    while (plan.hasMoreJobs() && J.activeWorkers < J.maxWorkers) {
        J.runNextJob();
    }

    return J.defer.promise;
};

Jobs.prototype.runNextJob = function() {
    var J = this;
    if (J.plan.hasMoreJobs() && J.activeWorkers < J.maxWorkers) {
        J.work(J.plan.nextJob());
    }
};

// TODO: remove result if not used
Jobs.prototype.finished = function(nodeID, result) {
    var J = this;

    J.activeWorkers--;
    J.plan.finished(nodeID, result);

    if (J.plan.allDone() && J.activeWorkers == 0) {
        return J.defer.resolve();
    }

    process.nextTick(function() {
        J.runNextJob();
    });
};

Jobs.prototype.work = function(job) {
    var J = this,
        // TODO: remove result if not used
        cb = function(result) {
            J.finished(job.id, result);
        };

    J.activeWorkers++;

    process.nextTick(
        function() {
            if (!job.node.run) return cb();
            var ctx = {
                jobs: J,
                plan: J.plan,
                graph: J.plan.graph
            };
            Q.when(job.node.run(ctx), cb, J.defer.reject);
        }
    );
};
