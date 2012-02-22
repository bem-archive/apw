var Q = require('qq'),
    INHERIT = require('inherit'),
    extend = require('./util').extend;

module.exports = INHERIT({

    __constructor: function(plan, maxWorkers, ctx) {
        this.maxWorkers = maxWorkers || 4;
        this.activeWorkers = 0;
        this.ctx = ctx || {};

        this.finishListeners = {};

        this.plans = {};
        this.plansOrder = [];
        this.lastPlanIndex = 0;

        this.addPlan(plan);
    },

    addPlan: function(plan) {
        var id = plan.getId();
        if (!this.plans[id]) {
            this.plans[id] = plan;
            this.plansOrder.push(id);
        }
    },

    removePlan: function(id) {
        if (this.plans[id]) {
            this.plansOrder.splice(this.plansOrder.indexOf(id), 1);
            delete this.plans[id];
        }
    },

    nextPlanId: function() {
        this.lastPlanIndex++;
        if (this.lastPlanIndex >= this.plansOrder.length) {
            this.lastPlanIndex = 0;
        }
        return this.plansOrder[this.lastPlanIndex];
    },

    nextOperablePlan: function() {
        var startId = this.nextPlanId();

        if (startId !== undefined) {
            var plan = this.plans[startId];

            do {
                if (plan.isOperable()) return plan;
                plan = this.plans[this.nextPlanId()];
            } while (plan && plan.getId() !== startId);
        }
    },

    start: function() {
        this.defer = Q.defer();
        this.next();
        return this.defer.promise;
    },

    next: function() {
        var plan;
        while (this.activeWorkers < this.maxWorkers && (plan = this.nextOperablePlan())) {
            var nextJob = plan.nextJob();

            if (this.addFinishListener(nextJob.id, plan.getId())) {
                this.workPlan(nextJob, plan);
            }
        }
    },

    workPlan: function(nextJob, plan) {
        var _this = this;

        this.activeWorkers++;

        this.work(nextJob, plan)
            .then(function(id) {
                _this.activeWorkers--;

                _this.onJobFinished(id);

                if (plan.allDone() && _this.activeWorkers == 0) {
                    plan.onPlanFinish();
                    _this.defer.resolve();
                }

                _this.next();
            })
            .fail(function(err) {
                plan.fail();
                _this.defer.reject(err);
            });
    },

    onJobFinished: function(id) {
        var listeners = this.finishListeners[id];
        if (listeners) {
            for (var planId in listeners) {
                this.plans[planId].onJobFinish(id);
            }
            delete this.finishListeners[id];
        }
    },

    work: function(job, plan) {
        return Q.call(function() {
            if (!job.node.run) return job.id;
            var ctx = extend({}, this.ctx, {
                jobs: this,
                plan: plan,
                graph: plan.graph
            });
            return Q.invoke(job.node, 'run', ctx).then(function() {
                return job.id;
            });
        }, this, job);
    },

    addFinishListener: function(jobID, planID) {
        var alreadyIn = jobID in this.finishListeners,
            listeners = this.finishListeners[jobID] || {};

        listeners[planID] = true;
        this.finishListeners[jobID] = listeners;

        return !alreadyIn;
    }

});