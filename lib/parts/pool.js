var Q = require('qq'),
    INHERIT = require('inherit');

module.exports = INHERIT({

    __constructor: function(plan, maxWorkers) {
        this.maxWorkers = maxWorkers || 4;
        this.activeWorkers = 0;
        this.plan = plan;
    },

    start: function() {
        this.defer = Q.defer();
        this.next();
        return this.defer.promise;
    },

    next: function() {
        var _this = this;
        while (this.plan.hasMoreJobs() && this.activeWorkers < this.maxWorkers) {

            this.activeWorkers++;

            this.work(this.plan.nextJob())
                .then(function(id) {
                    _this.activeWorkers--;

                    _this.plan.onJobFinish(id);

                    if (_this.plan.allDone() && _this.activeWorkers == 0) {
                        _this.plan.onPlanFinish();
                        _this.defer.resolve();
                    }

                    _this.next();
                })
                .fail(this.defer.reject);

        }
    },

    work: function(job) {
        var _this = this;
        return Q.when(function() {
            if (!job.node.run) return;
            var ctx = {
                jobs: _this,
                plan: _this.plan,
                graph: _this.plan.graph
            };
            return Q.when(job.node.run(ctx), function() {
                return job.id;
            });
        }());
    }

});
