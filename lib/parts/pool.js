var Q = require('qq'),
    INHERIT = require('inherit'),
    extend = require('./util').extend;

module.exports = INHERIT({

    __constructor: function(maxWorkers, ctx) {
        this.maxWorkers = maxWorkers || 4;
        this.activeWorkers = 0;
        this.ctx = ctx || {};

        this.finishListeners = {};

        this.plans = {};
        this.plansOrder = [];
        this.lastPlanIndex = 0;

        this.defers = {};
    },

    start: function(plan) {
        var defer = this.getDefer(plan.getId());

        this.addPlan(plan);
        this.next();

        return defer.promise;
    },

    getDefer: function(id) {
        if (!this.defers[id]) {
            this.defers[id] = Q.defer();
        }
        return this.defers[id];
    },

    addPlan: function(plan) {
        var id = plan.getId();
        if (!this.plans[id]) {
            this.plans[id] = plan;
            this.plansOrder.push(id);
        }
    },

    removePlan: function(plan) {
        var id = typeof plan == 'string'? plan : plan.getId();
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

        if (startId) {
            var plan = this.plans[startId];

            do {
                if (plan.isOperable()) return plan;
                plan = this.plans[this.nextPlanId()];
            } while (plan && plan.getId() !== startId);
        }
    },

    next: function() {
        var plan;
        while (this.activeWorkers < this.maxWorkers && (plan = this.nextOperablePlan())) {
            var job = plan.nextJob();

            if (this.addFinishListener(job.id, plan.getId())) {
                this.workPlan(job, plan);
            } else {
                console.log('*** Waiting for already started job %j [%s]', job.id, plan.getId());
            }
        }
    },

    workPlan: function(job, plan) {
        var _this = this;

        this.activeWorkers++;

        this.work(job, plan)
            .then(function() {
                _this.activeWorkers--;

                _this.onJobFinished(job.id);
                _this.next();
            })
            .fail(function(err) {
                _this.onJobFinished(job.id, err);
            });
    },

    onJobFinished: function(id, err) {
        var listeners = this.finishListeners[id] || {},
            plan, defer;
        for (var planId in listeners) {
            plan = this.plans[planId];

            err? plan.onJobFail(id) : plan.onJobDone(id);

            if (err || plan.allDone()) {
                this.removePlan(plan);

                defer = this.getDefer(plan.getId());
                err? defer.reject(err) : defer.resolve();
            }
        }
        delete this.finishListeners[id];
    },

    work: function(job, plan) {
        return Q.call(function() {
            if (!job.node.run) return job.id;
            var ctx = extend({}, this.ctx, {
                jobs: this,
                plan: plan,
                graph: plan.graph
            });
            return Q.invoke(job.node, 'run', ctx);
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
