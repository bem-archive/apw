var Q = require('q'),
    INHERIT = require('inherit'),
    ASSERTS = require('./asserts'),
    extend = require('./util').extend;

module.exports = INHERIT(/** @lends Workers.prototype */ {

    /**
     * Creates an instance of Workers.
     *
     * @class Workers
     * @constructs
     * @param {Number} [maxWorkers] Maximum number of workers to run simultaneously.
     * @param {Object} [ctx] The hash to mix with default context in node 'run' function.
     */
    __constructor: function(maxWorkers, ctx) {
        this.maxWorkers = maxWorkers || 4;
        this.activeWorkers = 0;
        this.activeJobs = {};
        this.ctx = ctx || {};

        this.jobPlanFinishListeners = {};
        this.planJobFinishListeners = {};

        this.plans = {};
        this.plansOrder = [];
        this.lastPlanIndex = 0;

        this.defers = {};

        var _this = this;
        process.once('exit', function() {

            if (Object.keys(_this.plans).length) {
                console.error('*************************************************');
                console.error('WARNING! There are %s unfinished build processes!', Object.keys(_this.plans).length);
                console.error(
                    'This application exit is not planned. Please check',
                    'that all nodes in arch resolve or reject promises',
                    'they return.');
                console.log('Dump of plans of unfinished build processes follow.');

                Object.keys(_this.plans).forEach(function(id) {
                    var plan = _this.plans[id];
                    console.error('\nPlan(%s) for targets: %s\n%s', plan.getId(), plan.getTargets().join(', '), plan);
                    console.error('Jobs: %s', plan.jobs.join(', '));
                    console.error('Active jobs: %s', plan.activeJobs.join(', '));
                });

                console.error('*************************************************');

                process.exit(1);
            }

        });
    },

    /**
     * Start plan processing.
     *
     * @param {Plan} plan Plan to start.
     * @returns {Promise * Undefined} Promise of this start.
     */
    start: function(plan) {
        var defer = this.getDefer(plan.getId());

        this.addPlan(plan);
        this.next();

        return defer.promise;
    },

    /**
     * Create deffered for the plan ID.
     *
     * @param {String} id Plan ID to defer.
     * @param {Boolean} [remove=false] Remove defer from registry just before return
     * @returns {Q.Defer} Defer of this plan ID.
     */
    getDefer: function(id, remove) {
        var defer = this.defers[id] || (this.defers[id] = Q.defer());
        remove && delete this.defers[id];
        return defer;
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
     * Use excludeJobs to exclude plans with pending jobs only.
     *
     * @param {Object} excludeJobs Hash with job IDs to skip.
     * @returns {Plan|undefined} Next operable plan.
     */
    nextOperablePlan: function(excludeJobs) {
        var startId = this.nextPlanId();

        if (startId) {
            var plan = this.plans[startId];

            do {
                if (plan.isOperable()) {
                    if (!excludeJobs || plan.checkNextJob(excludeJobs)) return plan;
                    if (plan.isStuck()) {
                        this.terminatePlan(plan.getId(), 'Don\'t know how to build ' + plan.children[plan.root]);
                    }
                }
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
        while (this.activeWorkers < this.maxWorkers && (plan = this.nextOperablePlan(this.activeJobs))) {
            var job = plan.checkNextJob(this.activeJobs);

            if (!this.activeJobs[job.id]) {
                this.activeJobs[job.id] = 1;
                this.shiftJobFromPlans(job.id);
                this.workPlan(job, plan);
            }
        }

        return this;
    },

    /**
     * Prepare to run and remove job from operable plans.
     *
     * @param {String} id Job ID to shift from plans.
     */
    shiftJobFromPlans: function(id) {
        var plan = this.nextOperablePlan(),
            startId = plan && plan.getId(),
            donePlans = {};

        if (startId) {
            do {
                if (plan.nextJob(id)) {
                    this.addFinishListener(id, plan.getId());
                }
                donePlans[plan.getId()] = 1;
                plan = this.nextOperablePlan();
            } while (plan && !donePlans[plan.getId()]);
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
        ASSERTS.planLinksOk(plan);

        var _this = this,
            onDone = function() {
                _this.activeWorkers--;
                _this.onJobFinished(job.id);
                _this.next();
            },
            onError = function(err) {
                _this.onJobFinished(job.id, true, err);
            };

        this.activeWorkers++;

        this.work(job, plan)
            .done(onDone, onError);

        return this;
    },

    /**
     * Finish job processing, fire up listeners.
     *
     * @param {String} id Job ID.
     * @param {Boolean} fail True, if job failed.
     * @param {Object} [err] Optional reason of failure.
     * @returns {Workers} Chainable API.
     */
    onJobFinished: function(id, fail, err) {
        var listeners = this.jobPlanFinishListeners[id] || {},
            plan, defer;

        delete this.activeJobs[id];

        for (var planId in listeners) {
            plan = this.plans[planId];

            this.removeJobFinishListener(id, planId);

            fail? plan.onJobFail(id) : plan.onJobDone(id);

            if (fail || plan.allDone()) this.terminatePlan(planId, fail, err);
        }

        return this;
    },

    terminatePlan: function(planId, fail, err) {
        this.removePlan(planId);
        this.removePlanFinishListener(planId);

        var defer = this.getDefer(planId, true);
        fail? defer.reject(err) : defer.resolve();
    },

    /**
     * Run job.
     *
     * @param {Object} job Job to run.
     * @param {Plan} plan Plan from which this job is.
     * @returns {Promise} The result of Q.fcall.
     */
    work: function(job, plan) {
        return Q.fcall(function() {

            // Skip job if its node has no run() method
            if (!job.node.run) return;

            var ctx = extend({}, this.ctx, {
                arch: plan.arch,
                plan: plan
            });
            job.node.ctx = ctx;
            return Q.invoke(job.node, 'run', ctx)
                .fin(function() {
                    delete job.node.ctx;
                });

        }.bind(this));
    },

    /**
     * Add plan listening job finish. 
     *
     * @param {String} jobID Job ID to listen.
     * @param {String} planID Listener plan ID.
     * @returns {Boolean} Was it new listener or not.
     */
    addFinishListener: function(jobID, planID) {
        var pFinishListeners = this.jobPlanFinishListeners[jobID] || {},
            jFinishListeners = this.planJobFinishListeners[planID] || {};

        pFinishListeners[planID] = true;
        jFinishListeners[jobID] = true;

        this.jobPlanFinishListeners[jobID] = pFinishListeners;
        this.planJobFinishListeners[planID] = jFinishListeners;
    },

    /**
     * Remove plan listening job finish.
     *
     * @param {String} jobID Job ID to listen.
     * @param {String} planID Listener plan ID.
     */
    removeJobFinishListener: function(jobID, planID) {
        delete this.jobPlanFinishListeners[jobID][planID];
        delete this.planJobFinishListeners[planID][jobID];
    },

    /**
     * Remove plan listening all jobs finish.
     *
     * @param {String} planID Listener plan ID.
     */
    removePlanFinishListener: function(planID) {
        for (var jobID in this.planJobFinishListeners[planID]) {
            delete this.jobPlanFinishListeners[jobID][planID];
        }
        delete this.planJobFinishListeners[planID];
    }

});
