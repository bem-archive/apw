var INHERIT = require('inherit'),
    util = require('./util'),
    EventEmitter = require('events').EventEmitter,

    planIDSequence = 1;

module.exports = INHERIT(EventEmitter, {

    /**
     * Create an instance of Plan.
     *
     * @constructor
     * @param {Arch} arch Arch from this plan created.
     * @param {String[]|String} targets Root node IDs to build.
     * @param {String} [root] Root plan node ID (don't set if you don't know what is it)
     * @param {String} [id] Plan ID.
     */
    __constructor: function(arch, targets, root, id) {
        this.arch = arch;
        this.id = id || planIDSequence++;
        this.root = root || '__plan_' + this.id + '_root__';

        this.parents = {};
        this.children = {};
        this.children[this.root] = [];

        this.jobs = [];
        this.activeJobs = [];
        this.doneJobs = [];

        this.locked = false;

        this.arch.registerPlan(this);
        this.init(targets);
    },

    /**
     * Init plan starting from target IDs.
     *
     * @param {String[]|String} targets Root node IDs to build.
     * @returns {Plan} Chainable API.
     */
    init: function(targets) {
        var ids = this._getIDs(util.toArray(targets));
        for (var id in ids) {
            this.link(id);
            this._gatherIDs(id);
        }
        return this;
    },

    /**
     * Gather child IDs and link them to provided parent node ID.
     *
     * @param {String} id Node ID to gather children for.
     */
    _gatherIDs: function(id) {
        var children = this.arch.children[id] || [];

        for (var i = 0; i < children.length; i++) {
            this.link(children[i], id);
            this._gatherIDs(children[i]);
        }
    },

    /**
     * Convert array of IDs to object with unique IDs as keys.
     *
     * @param {String[]|arguments} args IDs to convert.
     * @returns {Object} IDs.
     */
    _getIDs: function(args) {
        if (args.length) {
            if (Array.isArray(args[0])) {
                return util.arrayToObject(args[0]);
            } else {
                var ids = {};
                args.forEach(function(v) {
                    ids[v] = 1;
                });
                return ids;
            }
        }
        return {};
    },

    /**
     * Return this plan ID.
     *
     * @returns {String} This plan ID.
     */
    getId: function() {
        return this.id;
    },

    /**
     * Rescan jobs to find next ready to run jobs, previously blocked by unfinished jobs.
     *
     * @param {String[]|String} ids Finished jobs IDs
     * @returns {Plan} Chainable API.
     */
    rescanJobs: function(ids) {
        util.toArray(ids).forEach(function(id) {
            this.removeJobs(this.parents[id]);
            this.children[id].length || this.addJob(id);
        }, this);

        return this;
    },

    /**
     * Remove specific jobs.
     *
     * @param {String[]} ids Jobs IDs to remove.
     * @returns {Plan} Chainable API.
     */
    removeJobs: function(ids) {
        if (ids && ids.length) {
            for (var i = 0; i < ids.length; i++) {
                this.removeJob(ids[i]);
            }
        }

        return this;
    },

    /**
     * Remove job from jobs to run.
     *
     * @param {String} id Job ID to remove.
     * @returns {Plan} Chainable API.
     */
    removeJob: function(id) {
        var i = this.jobs.indexOf(id);
        if (i !== -1) this.jobs.splice(i, 1);

        return this;
    },

    /**
     * Check if this plan is operable: not failed and has jobs to run.
     *
     * @returns {boolean} True if operable, otherwise false.
     */
    isOperable: function() {
        return this.jobs.length > 0 && !this.failed;
    },

    /**
     * Return next job ready to run.
     * If this plan is locked or there are no ready jobs, return undefined.
     *
     * @returns {Object|undefined} Job object containing id and node properties.
     */
    nextJob: function() {
        var id;
        if (!this.locked && (id = this.jobs.shift())) {
            this.activeJobs.push(id);
            return {
                id: id,
                node: this.arch.getNode(id)
            };
        }
    },

    /**
     * Collect leaves IDs starting search from provided root node ID.
     *
     * @param {String} root Node ID to start from.
     * @returns {Object} Leaves IDs as keys.
     */
    collectLeaves: function(root) {
        var hLeaves = {},
            wasHere = {}, // simple arch loops guard
            aLeaves = [];

        this._collectLeaves(root, hLeaves, wasHere);

        for (var id in hLeaves) aLeaves.push(id);

        return aLeaves;
    },

    /**
     * Collect leaves IDs starting search from provided node ID.
     *
     * @param {String} id Node ID to start from.
     * @param {Object} leaves Collected leaves.
     * @param {Object} wasHere Guardian to protect from loops.
     */
    _collectLeaves: function(id, leaves, wasHere) {
        if (!wasHere[id]) {

            wasHere[id] = 1;

            var children = this.arch.getChildrenIds(id);

            if (!children.length) {
                leaves[id] = 1;
            } else {
                for (var i = 0; i < children.length; i++) {
                    this._collectLeaves(children[i], leaves, wasHere);
                }
            }
        }
    },

    /**
     * Refactor jobs after adding new jobs:
     * 1. Add leaves.
     * 2. Remove not-leaves.
     *
     * @param {String[]} jobsToAdd New jobs IDs.
     * @returns {Plan} Chainable API.
     */
    refactorJobs: function(jobsToAdd) {
        var _this = this,
            jobs = [],
            children,
            hJobs = {};

        jobsToAdd = jobsToAdd || [];

        this.jobs.forEach(function(job) {
            children = _this.children[job];
            if (!children || !children.length) {
                hJobs[job] = 1;
            }
        });

        jobsToAdd.forEach(function(job) {
            if (!hJobs[job]) hJobs[job] = 1;
        });

        for (var job in hJobs) {
            if (this.doneJobs.indexOf(job) === -1 &&
                this.activeJobs.indexOf(job) === -1) jobs.push(job);
        }

        this.jobs = jobs;

        return this;
    },

    /**
     * Link nodes.
     *
     * @param {String[]|String} children IDs of child nodes.
     * @param {String[]|String} parents IDs of parent nodes.
     * @returns {Plan} Chainable API.
     */
    link: function(children, parents) {
        parents = util.toArray(parents || [this.root]);
        util.toArray(children).forEach(function(child) {
            parents.forEach(function(parent) {
                this.injectSubArch(child, parent)
            }, this)
        }, this)

        return this;
    },

    /**
     * Inject sub-arch into this plan. All nodes will linked to their children / parents.
     *
     * @param {String} child Root node ID of sub-arch to inject.
     * @param {String} parent Parent node ID in this plan.
     * @returns {Plan} Chainable API.
     */
    injectSubArch: function(child, parent) {
        var children = this.arch.getChildrenIds(child);

        this._link(child, parent);
        children.forEach(function(id) {
            this.injectSubArch(id, child);
        }, this);

        this.refactorJobs(this.collectLeaves(child));

        return this;
    },

    /**
     * Link child node with parent.
     *
     * @param {String} child Child node ID.
     * @param {String} parent Parent node ID.
     */
    _link: function(child, parent) {
        parent = parent || this.root;

        if (!this.parents[child]) this.parents[child] = [];
        if (!this.parents[parent]) this.parents[parent] = [];
        if (!this.children[child]) this.children[child] = [];
        if (!this.children[parent]) this.children[parent] = [];

        var children = this.children[parent],
            parents = this.parents[child];

        if (children.indexOf(child) === -1) children.push(child);
        if (parents.indexOf(parent) === -1) parents.push(parent);

        this.children[parent] = children;
        this.parents[child] = parents;
    },

    /**
     * Unlink linked (child-parent) nodes.
     *
     * @param {String} id1 First node ID to unlink.
     * @param {String} id2 Second node ID to unlink.
     * @returns {Plan} Chainable API.
     */
    unlink: function(id1, id2) {
        var parents1 = this.parents[id1],
            parents2 = this.parents[id2];

        if (parents1 && parents2) {
            util.unlink(parents1, this.children[id1], id2);
            util.unlink(parents2, this.children[id2], id1);

            if (!parents1.length) this.link(id1, this.root);
            if (!parents2.length) this.link(id2, this.root);
        }

        this.rescanJobs([id1, id2]);

        return this;
    },

    /**
     * Check if node with such ID exists in this plan.
     *
     * @param {String} id Node ID to check.
     * @returns {boolean} True if exists, otherwise false.
     */
    hasNode: function(id) {
        return this.parents[id] && this.parents[id].length > 0;
    },

    /**
     * Remove node from plan.
     *
     * @param {String} id Node ID to remove.
     * @returns {Plan} Chainable API.
     */
    removeNode: function(id) {
        var parents = this.parents[id],
            children = this.children[id];

        util.removeNode(this.children, this.parents, id);

        children.forEach(function(child) {
            this.parents[child].length || this.link(child, this.root);
        }, this);

        this.removeJob(id);
        this.rescanJobs(parents);

        return this;
    },

    /**
     * Add job to jobs list.
     *
     * @param {String} id Job ID to add.
     * @returns {Plan} Chainable API.
     */
    addJob: function(id) {
        if (this.doneJobs.indexOf(id) === -1 &&
            this.activeJobs.indexOf(id) === -1 &&
            this.jobs.indexOf(id) === -1) this.jobs.push(id);

        return this;
    },

    /**
     * Lock this plan.
     *
     * @returns {Plan} Chainable API.
     */
    lock: function() {
        this.locked = true;

        return this;
    },

    /**
     * Unlock this plan.
     *
     * @returns {Plan} Chainable API.
     */
    unlock: function() {
        this.locked = false;

        return this;
    },

    /**
     * Finalize job run: remove from plan, etc.
     *
     * @param {String} id Job ID.
     * @returns {Plan} Chainable API.
     */
    onJobDone: function(id) {
        this.parents[id].forEach(function(pID) {
            var children = this.children[pID];
            children.splice(children.indexOf(id), 1);
            if (!children.length && pID !== this.root) this.addJob(pID);
        }, this);

        delete this.parents[id];
        this.activeJobs.splice(this.activeJobs.indexOf(id), 1);
        this.doneJobs.push(id);

        if (this.allDone()) this.onAllDone();

        return this;
    },

    /**
     * Fail this plan.
     *
     * @returns {Plan} Chainable API.
     */
    onJobFail: function() {
        this.failed = true;
        this.onAllDone();

        return this;
    },

    /**
     * Finalize all done activity: unregister plan, emit event.
     *
     * @returns {Plan} Chainable API.
     */
    onAllDone: function() {
        this.arch.unregisterPlan(this);
        this.emit('allDone', this.getId());

        return this;
    },

    /**
     * Check if all jobs are done.
     *
     * @returns {boolean} True if all done, otherwise false.
     */
    allDone: function() {
        return (!this.locked &&
            !this.jobs.length &&
            !this.activeJobs.length &&
            !this.children[this.root].length);
    },

    /**
     * Dump this plan to string for debug purposes.
     *
     * @returns {String} String representation of this plan.
     */
    toString: function() {
        return 'Plan[' + this.id + ']:\n' + this.nodeToString(this.root, ' ');
    },

    /**
     * Dump node with its children to string.
     *
     * @param {String} id Node ID to dump.
     * @param {String} spaces Left indent spaces.
     */
    nodeToString: function(id, spaces) {
        return spaces + id + '\n' +
            (this.children[id] || []).map(function(child) {
                    return spaces + this.nodeToString(child, spaces + ' ')
                }, this).join('')
    }

});
