function Jobs(plan, maxWorkers, cb) {
    var J = this;

    J.maxWorkers = maxWorkers;
    J.activeWorkers = 0;
    J.plan = plan;
    J.cb = cb;
}

exports.newJobs = function(plan, maxWorkers, cb) {
    return new Jobs(plan, maxWorkers || 4, cb);
};

Jobs.prototype.start = function() {
    var J = this,
        plan = J.plan;

    plan.rescanJobs();
    while (plan.hasMoreJobs() && J.activeWorkers < J.maxWorkers) {
        J.runNextJob();
    }
};

Jobs.prototype.runNextJob = function() {
    var J = this;
    if (J.activeWorkers < J.maxWorkers) {
        var job = J.plan.nextJob();
        if (job) {
            J.work(job);
        }
    }
};

Jobs.prototype.finished = function(nodeID, result) {
    var J = this;

    J.activeWorkers--;
    J.plan.finished(nodeID, result);

    if (J.plan.allDone() && J.activeWorkers == 0) {
        if (J.cb) return J.cb();
    }
    process.nextTick(function() { J.runNextJob() });
};

Jobs.prototype.work = function(job) {
    var J = this;
    J.activeWorkers++;
    process.nextTick(
        function() {
            job.node.run(function(result) {
                J.finished(job.id, result);
            })
        }
    );
};