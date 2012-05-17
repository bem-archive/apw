var INHERIT = require('inherit'),
    ASSERTS = require('./asserts'),
    util = require('./util'),
    EventEmitter = require('events').EventEmitter,

    planIDSequence = 1;

module.exports = INHERIT(EventEmitter, /** @lends Plan.prototype */ {

    /**
     * Create an instance of Plan.
     *
     * @class Plan
     * @constructs
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
        this.parents[this.root] = [];

        this.jobs = [];
        this.activeJobs = [];
        this.doneJobs = [];

        this.locked = 0;

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
     * Return this plan targets.
     *
     * @return {String[]} This plan targets.
     */
    getTargets: function() {
        return this.children[this.root];
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
     * Returns next job not in excluded jobs.
     *
     * @param {Object} excludeJobs Jobs IDs to skip.
     * @returns {boolean} True if operable, otherwise false.
     */
    getOtherJob: function(excludeJobs) {
        for (var i = 0; i < this.jobs.length; i++) {
            if (!excludeJobs || !excludeJobs[this.jobs[i]]) return this.jobs[i];
        }
    },

    /**
     * Return next job ready to run.
     * If this plan is locked or there are no ready jobs, return undefined.
     * Don't use this method just to get job (not prepare it for run), use checkNextJob instead.
     *
     * @param {String|undefined} id Prepare and shift exactly this job.
     * @returns {Object|undefined} Job object containing id and node properties.
     */
    nextJob: function(id) {
        var _this = this;

        function pushJob(id) {
            _this.activeJobs.push(id);
            return {
                id: id,
                node: _this.arch.getNode(id)
            };
        }

        if (!this.locked && this.jobs.length) {
            if (id) {
                var i = this.jobs.indexOf(id);
                return (i !== -1) && pushJob(this.jobs.splice(i, 1)[0]);
            }
            return pushJob(this.jobs.shift());
        }
    },

    /**
     * Return next job ready to run.
     * If this plan is locked or there are no ready jobs, return undefined.
     * Use this method to get (not prepare to run) next job and to check job availability.
     *
     * @param {Object} excludeJobs Job IDs to skip.
     * @param {String|undefined} id Job ID to check.
     * @returns {Object|undefined} Job object containing id and node properties.
     */
    checkNextJob: function(excludeJobs, id) {
        if (!this.locked && this.jobs.length) {
            id = id || this.getOtherJob(excludeJobs);
            if (id && this.jobs.indexOf(id) !== -1) {
                return {
                    id: id,
                    node: this.arch.getNode(id)
                }
            }
        }
    },

    /**
     * Check if job was already done in this plan.
     *
     * @param {String} id   Job id.
     * @return {Boolean}
     */
    isJobAlreadyDone: function(id) {
        return this.doneJobs.indexOf(id) !== -1;
    },

    isActiveJob: function(id) {
        return this.activeJobs.indexOf(id) !== -1;
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
        if (!wasHere[id] && !this.isJobAlreadyDone(id)) {

            wasHere[id] = 1;

            var children = this.arch.getChildren(id);

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
        var jobs = [],
            children,
            hJobs = {};

        jobsToAdd = jobsToAdd || [];

        this.jobs.forEach(function(job) {
            children = this.children[job];
            if (!children || !children.length) {
                hJobs[job] = 1;
            }
        }, this);

        jobsToAdd.forEach(function(job) {
            if (!hJobs[job]) hJobs[job] = 1;
        });

        for (var job in hJobs) {
            if (!this.isActiveJob(job)) jobs.push(job);
        }

        this.jobs = jobs;

        return this;
    },

    /**
     * Link nodes.
     * Already done nodes will be skipped.
     *
     * @param {String[]|String} children IDs of child nodes.
     * @param {String[]|String} parents IDs of parent nodes.
     * @returns {Plan} Chainable API.
     */
    link: function(children, parents) {
        parents = util.toArray(parents || [this.root]);

        util.toArray(children).forEach(function(child) {
                parents.forEach(function(parent) {
                    this.injectSubArch(child, parent);
                }, this);
            }, this);

        ASSERTS.planNodesLinkedToRoot(this);

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
        ASSERTS.idTypeIsString(child);
        ASSERTS.idTypeIsString(parent);

        if (this.hasNode(parent) &&
            !this.isJobAlreadyDone(child) &&
            !this.isJobAlreadyDone(parent)) {

            // NOTE: assert parent in case we are really going to link to it
            ASSERTS.notActiveJob(parent, this);

            this._link(child, parent);
            this.arch.getChildren(child).forEach(function(id) {
                this.injectSubArch(id, child);
            }, this);

            this.refactorJobs(this.collectLeaves(child));
        }

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
        ASSERTS.idTypeIsString(id1);
        ASSERTS.idTypeIsString(id2);
        ASSERTS.hasId(id1, this);
        ASSERTS.hasId(id2, this);

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
        return !!this.parents[id];
    },

    /**
     * Check if node with such ID has parents with provided IDs.
     *
     * @param {String} id Child node ID to check.
     * @param {String|String[]} parents Parent IDs to check.
     * @returns {boolean} True if all IDs are parent for this child, otherwise false.
     */
    hasParents: function(id, parents) {
        ASSERTS.idTypeIsString(id);
        ASSERTS.hasId(id, this);

        return util.hasLink(id, this, 'parents', parents);
    },

    /**
     * Check if node with such ID has children with provided IDs.
     *
     * @param {String} id Parent node ID to check.
     * @param {String|String[]} children Child IDs to check.
     * @returns {boolean} True if all IDs are children for this parent, otherwise false.
     */
    hasChildren: function(id, children) {
        ASSERTS.idTypeIsString(id);
        ASSERTS.hasId(id, this);

        return util.hasLink(id, this, 'children', children);
    },

    /**
     * Remove node from plan.
     *
     * @param {String} id Node ID to remove.
     * @returns {Plan} Chainable API.
     */
    removeNode: function(id) {
        ASSERTS.idTypeIsString(id);
        ASSERTS.hasId(id, this);

        var parents = this.parents[id],
            children = this.children[id];

        util.removeNode(this.children, this.parents, id);

        this.removeJob(id);
        // TODO: think about rescan after removeTree(), not removeNode() 
        this.rescanJobs(parents);

        return this;
    },

    /**
     * Remove tree from plan.
     * Use forced removal to remove nodes with links to other parents (not belonging to removed tree).
     * So in "A->[B,C]->D" plan (D is the child of both B and C) forced removal will remove D node.
     *
     * @param {String} id Tree root node ID.
     * @param {boolean} forced Remove child nodes with links to other parents too.
     * @returns {Plan} Chainable API.
     */
    removeTree: function(id, forced) {
        ASSERTS.idTypeIsString(id);
        ASSERTS.hasId(id, this);

        var children = this.children[id];
        
        children.forEach(function(cId) {
            this._removeTree(cId, forced);
        }, this);

        this.removeNode(id);

        return this;
    },

    _removeTree: function(id, forced) {
        if (this.parents[id].length === 1 || forced) {
            var children = this.children[id];

            children.forEach(function(cId) {
                this._removeTree(cId, forced);
            }, this);

            this.removeNode(id);
        }
    },

    /**
     * Add job to jobs list.
     *
     * @param {String} id Job ID to add.
     * @returns {Plan} Chainable API.
     */
    addJob: function(id) {
        ASSERTS.idTypeIsString(id);

        if (!this.isJobAlreadyDone(id) &&
            !this.isActiveJob(id) &&
            this.jobs.indexOf(id) === -1) this.jobs.push(id);

        return this;
    },

    /**
     * Lock this plan.
     *
     * @returns {Plan} Chainable API.
     */
    lock: function() {
        this.locked++;

        return this;
    },

    /**
     * Unlock this plan.
     *
     * @returns {Plan} Chainable API.
     */
    unlock: function() {
        if (this.locked) this.locked--;

        return this;
    },

    /**
     * Finalize job run: remove from plan, etc.
     *
     * @param {String} id Job ID.
     * @returns {Plan} Chainable API.
     */
    onJobDone: function(id) {
        ASSERTS.hasId(id, this.arch);

        this.parents[id].forEach(function(pID) {
            var children = this.children[pID];
            children.splice(children.indexOf(id), 1);
            if (!children.length && pID !== this.root) this.addJob(pID);
        }, this);

        delete this.parents[id];
        delete this.children[id];

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
        this.onAllFail();

        return this;
    },

    /**
     * Finalize all done activity, emit allDone event.
     *
     * @returns {Plan} Chainable API.
     */
    onAllDone: function() {
        ASSERTS.planDone(this);

        this.emit('allDone', this.getId());

        return this;
    },

    /**
     * Finalize all done activity on plan fail, emit allDone event.
     *
     * @returns {Plan} Chainable API.
     */
    onAllFail: function() {
        ASSERTS.planFail(this);

        this.emit('allDone', this.getId());

        return this;
    },

    /**
     * Check if all jobs are done.
     *
     * @returns {boolean} True if all done, otherwise false.
     */
    allDone: function() {
        return (/*!this.locked &&*/
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
     * Dump this plan to Graphviz string for debug purposes.
     *
     * @returns {String} Graphviz string representation of this plan.
     */
    toGraphviz: function() {
        return 'digraph G {\n' + this.nodeToGraphviz(this.root, {}) + '}\n';
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
    },

    /**
     * Dump node with its children to Graphviz string.
     *
     * @param {String} id Node ID to dump.
     */
    nodeToGraphviz: function(id, done) {
        var thisNode = '"' + id + '"',
            s = '    ' + thisNode + ';\n',
            children = this.children[id] || [];

        if (!(id in done)) done[id] = {};

        children.forEach(function(child) {
            if (!done[id][child]) {
                s += '    ' + thisNode + ' -> "' + child + '";\n';
            }
        });
        children.forEach(function(child) {
            if (!done[id][child]) {
                done[id][child] = 1;
                s += this.nodeToGraphviz(child, done);
            }
        }, this);

        return s;
    }

});
