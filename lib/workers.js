var Q = require('qq'),
    INHERIT = require('inherit'),
    extend = require('./util').extend;

module.exports = INHERIT({

    /**
     * Creates an instance of Plan.
     *
     * @constructor
     * @param {number} [maxWorkers] Maximum number of workers to run in one time.
     * @param {object} [ctx] The hash to mix with default context in node 'run' function.
     */
    __constructor: function(maxWorkers, ctx) {
        this.maxWorkers = maxWorkers || 4;
        this.activeWorkers = 0;
        this.activeJobs = {};
        this.ctx = ctx || {};

        this.finishListeners = {};

        this.plans = {};
        this.plansOrder = [];
        this.lastPlanIndex = 0;

        this.defers = {};
    },

    /**
     * Start plan processing.
     *
     * @param {Plan} plan Plan to start.
     * @returns {promise} Promise of this start.
     */
    start: function(plan) {
        var defer = this.getDefer(plan.getId());

        this.addPlan(plan);
        this.next();

        return defer.promise;
    },

    /**
     * Create Q.defer for plan ID.
     *
     * @param {String} id Plan ID to defer.
     * @returns {defer} Defer of this plan ID.
     */
    getDefer: function(id) {
        if (!this.defers[id]) {
            this.defers[id] = Q.defer();
        }
        return this.defers[id];
    },

    /**
     * Add plan to process. If it is here already, just skip.
     * Keep in mind, that adding plan is also plan processing start.
     *
     * @param {Plan} plan Plan to add.
     * @returns {Workers} Chainable API.
     */
    addPlan: function(plan) {
        var id = plan.getId();
        if (!this.plans[id]) {
            this.plans[id] = plan;
            this.plansOrder.push(id);
        }

        return this;
    },

    /**
     * Remove plan.
     *
     * @param {String|Plan} plan Plan to remove.
     * @returns {Workers} Chainable API.
     */
    removePlan: function(plan) {
        var id = typeof plan == 'string'? plan : plan.getId();
        if (this.plans[id]) {
            this.plansOrder.splice(this.plansOrder.indexOf(id), 1);
            delete this.plans[id];
        }

        return this;
    },

    /**
     * Return next plan ID from the list.
     * If previous plan was the last one, first plan ID will be returned.
     *
     * @returns {String} Next plan ID from the list.
     */
    nextPlanId: function() {
        if (++this.lastPlanIndex >= this.plansOrder.length) {
            this.lastPlanIndex = 0;
        }
        return this.plansOrder[this.lastPlanIndex];
    },

    /**
     * Return next operable plan from the list.
     * If there are no such plan, the result is undefined.
     *
     * @returns {Plan|undefined} Next operable plan.
     */
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

    /**
     * Start next job processing from the next operable plan.
     *
     * @returns {Workers} Chainable API.
     */
    next: function() {
        var plan;
        while (this.activeWorkers < this.maxWorkers && (plan = this.nextOperablePlan())) {
            var job = plan.checkNextJob();

            if (!this.activeJobs[job.id]) {

                this.activeJobs[job.id] = 1;
                this.shiftJobsFromPlans(job.id);

                this.workPlan(job, plan);
            }
        }

        return this;
    },

    shiftJobsFromPlans: function(id) {
        var plan = this.nextOperablePlan(),
            startId = plan && plan.getId();

        if (startId) {
            do {
                if (plan.nextJob(id)) {
                    this.addFinishListener(id, plan.getId());
                }
                plan = this.nextOperablePlan();
            } while (plan && plan.getId() !== startId);
        }
    },

    /**
     * Start job processing from the specific plan.
     *
     * @param {Object} job Job to run.
     * @param {Plan} plan Plan to work.
     * @returns {Workers} Chainable API.
     */
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
            })
            .end();

        return this;
    },

    /**
     * Finish job processing, fire up listeners.
     *
     * @param {String} id Job ID.
     * @param {Object} err Error, if any.
     * @returns {Workers} Chainable API.
     */
    onJobFinished: function(id, err) {
        var listeners = this.finishListeners[id] || {},
            plan, defer;
        for (var planId in listeners) {
            this.removeFinishListener(id, planId);
            plan = this.plans[planId];

            err? plan.onJobFail(id) : plan.onJobDone(id);

            if (err || plan.allDone()) {
                this.removePlan(plan);

                defer = this.getDefer(plan.getId());
                err? defer.reject(err) : defer.resolve();
            }
        }
        delete this.finishListeners[id];

        return this;
    },

    /**
     * Run job.
     *
     * @param {Object} job Job to run.
     * @param {Plan} plan Plan from which this job is.
     * @returns {Q.call} The result of Q.call.
     */
    work: function(job, plan) {
        return Q.call(function() {

            // Skip job if its node has no run() method
            if (!job.node.run) return;

            return Q.invoke(
                job.node,
                'run',
                extend({}, this.ctx, {
                    arch: plan.arch,
                    plan: plan
                }));

        }, this, job);
    },

    /**
     * Add plan listening job finish. 
     *
     * @param {String} jobID Job ID to listen.
     * @param {String} planID Listener plan ID.
     * @returns {boolean} Was it new listener or not.
     */
    addFinishListener: function(jobID, planID) {
        var alreadyIn = jobID in this.finishListeners,
            listeners = this.finishListeners[jobID] = this.finishListeners[jobID] || {};

        listeners[planID] = true;

        return !alreadyIn;
    },

    /**
     * Remove plan listening job finish.
     *
     * @param {String} jobID Job ID to listen.
     * @param {String} planID Listener plan ID.
     */
    removeFinishListener: function(jobID, planID) {
        var listeners = this.finishListeners[jobID];
        delete listeners[planID];
        if (!listeners.length) delete this.finishListeners[jobID];
    }

});
