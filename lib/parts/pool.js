var Q = require('qq'),
    INHERIT = require('inherit'),
    extend = require('./util').extend;

module.exports = INHERIT({

    __constructor: function(plan, maxWorkers, ctx) {
        this.maxWorkers = maxWorkers || 4;
        this.activeWorkers = 0;
        this.plan = plan;
        this.ctx = ctx || {};
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
        return Q.call(function() {
            if (!job.node.run) return job.id;
            var ctx = extend({}, this.ctx, {
                jobs: this,
                plan: this.plan,
                graph: this.plan.graph
            });
            return Q.invoke(job.node, 'run', ctx).then(function() {
                return job.id;
            });
        }, this, job);
    }

});
