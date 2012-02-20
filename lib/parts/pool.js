var Q = require('qq'),
    INHERIT = require('inherit');

module.exports = INHERIT({

    __constructor: function(plan, maxWorkers) {
        this.maxWorkers = maxWorkers || 4;
        this.activeWorkers = 0;
        this.plan = plan;
    },

    start: function() {
        this.runNextJobs();

        this.defer = Q.defer();
        return this.defer.promise;
    },

    runNextJobs: function() {
        while (this.plan.hasMoreJobs() && this.activeWorkers < this.maxWorkers) {
            this.work(this.plan.nextJob());
        }
    },

    // TODO: promises:
    // work() return promise
    // Jobs watches work() promise in runNextJob()
    // Plan watches runNextJob() promise in plan.finished() or something
    work: function(job) {
        var _this = this,
            cb = function() {
                _this.onFinished(job.id);
            };

        _this.activeWorkers++;

        process.nextTick(function() {
            if (!job.node.run) return cb();
            var ctx = {
                jobs: _this,
                plan: _this.plan,
                graph: _this.plan.graph
            };
            Q.when(job.node.run(ctx), cb, _this.defer.reject).fail(_this.defer.reject);
        });
    },

    onFinished: function(nodeID) {
        this.activeWorkers--;
        this.plan.finished(nodeID);

        if (this.plan.allDone() && this.activeWorkers == 0) {
            return this.defer.resolve();
        }

        var _this = this;
        process.nextTick(function() {
            _this.runNextJobs();
        });
    }

});
