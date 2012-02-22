var Q = require('qq'),
    INHERIT = require('inherit');

module.exports = INHERIT({

    __constructor: function(plan, maxWorkers, method) {
        this.maxWorkers = maxWorkers || 4;
        this.activeWorkers = 0;
        this.plan = plan;
        this.method = method || 'run';
    },

    start: function() {
        this.defer = Q.defer();
        this.next();
        return this.defer.promise;
    },

    next: function() {
        var _this = this;
        while (this.plan.isOperable() && this.activeWorkers < this.maxWorkers) {

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
                .fail(function(err) {
                    _this.plan.fail();
                    _this.defer.reject(err);
                });

        }
    },

    work: function(job) {
        var _this = this;
        return Q.when(function() {
            if (!job.node[_this.method]) return job.id;
            var ctx = {
                jobs: _this,
                plan: _this.plan,
                graph: _this.plan.graph
            };
            return Q.when(job.node[_this.method](ctx), function() {
                return job.id;
            });
        }());
    }

});
