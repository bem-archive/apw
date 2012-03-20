var INHERIT = require('inherit'),
    util = require('./util'),
    EventEmitter = require('events').EventEmitter,

    planIDSequence = 1;

module.exports = INHERIT(EventEmitter, {

    __constructor: function(arch, targets, root, id) {
        this.arch = arch;
        this.id = id || planIDSequence++;
        this.root = root || '__plan_' + this.id + '_root__';

        this.parents = {};
        this.children = {};
        this.children[this.root] = [];

        this.jobs = [];
        this.activeJobs = [];

        this.locked = false;

        this.arch.registerPlan(this);
        this.init(targets);

        EventEmitter.call(this);
    },

    init: function(targets) {
        if (!Array.isArray(targets)) targets = [targets];

        var ids = this._getIDs(targets);
        for (var id in ids) {
            this.link(id);
            this._gatherIDs(id);
        }
    },

    _gatherIDs: function(id) {
        var children = this.arch.children[id] || [];

        for (var i = 0; i < children.length; i++) {
            this.link(children[i], id);
            this._gatherIDs(children[i]);
        }
    },

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

    getId: function() {
        return this.id;
    },

    // TODO: не звать rescanJobs() на каждую модификацию или избавиться
    // от необходимости ставить и снимать лок вручную
    rescanJobs: function(ids) {
        if (!Array.isArray(ids)) ids = [ids];

        for (var id, i = 0; i < ids.length; i++) {
            id = ids[i];
            this.removeJobs(this.parents[id]);
            if (!this.children[id].length) this.addJob(id);
        }
    },

    removeJobs: function(ids) {
        if (ids && ids.length) {
            for (var i = 0; i < ids.length; i++) {
                this.removeJob(ids[i]);
            }
        }
    },

    removeJob: function(id) {
        var i = this.jobs.indexOf(id);
        if (i !== -1) this.jobs.splice(i, 1);
    },

    isOperable: function() {
        return this.jobs.length > 0 && !this.failed;
    },

    nextJob: function() {
        var job;
        if (!this.locked && (job = this.jobs.shift())) {
            this.activeJobs.push(job);
            return this.arch.getNode(job);
        }
    },

// =============================================
    collectLeaves: function(root) {
        var hLeaves = {},
            wasHere = {}, // simple arch loops guard
            aLeaves = [];

        this._collectLeaves(root, hLeaves, wasHere);

        for (var id in hLeaves) aLeaves.push(id);

        return aLeaves;
    },

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

        for (var job in hJobs) jobs.push(job); 

        this.jobs = jobs;
    },

    // TODO: looks like we can link / inject in less steps
    link: function(children, parents) {
        if (!Array.isArray(children)) children = [children];

        parents = parents || [this.root];
        if (!Array.isArray(parents)) parents = [parents];

        for (var i = 0; i < children.length; i++) {
            for (var j = 0; j < parents.length; j++) {
                this.injectSubGraph(children[i], parents[j]);
            }
        }
    },

    injectSubGraph: function(child, parent) {
        var _this = this,
            children = this.arch.getChildrenIds(child);

        this._link(child, parent);
        children.forEach(function(id) {
            _this.injectSubGraph(id, child);
        });

        this.refactorJobs(this.collectLeaves(child));
    },

// ================================================

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
    },

    hasNode: function(id) {
        return this.parents[id] && this.parents[id].length > 0;
    },

    removeNode: function(id) {
        var parents = this.parents[id],
            children = this.children[id];

        util.removeNode(this.children, this.parents, id);

        for (var i = 0; i < children.length; i++) {
            if (!this.parents[children[i]].length) this.link(children[i], this.root);
        }

        this.removeJob(id);
        this.rescanJobs(parents);
    },

    addJob: function(id) {
        if (this.activeJobs.indexOf(id) === -1 && this.jobs.indexOf(id) === -1) this.jobs.push(id);
    },

    lock: function() {
        this.locked = true;
    },

    unlock: function() {
        this.locked = false;
    },

    onJobDone: function(id) {
        var parents = this.parents[id],
            children,
            pID;

        for (var i = 0; i < parents.length; i++) {
            pID = parents[i];
            children = this.children[pID];
            children.splice(children.indexOf(id), 1);
            if (!children.length && pID !== this.root) this.addJob(pID);
        }

        delete this.parents[id];
        this.activeJobs.splice(this.activeJobs.indexOf(id), 1);

        if (this.allDone()) this.onAllDone();
    },

    onJobFail: function(id) {
        this.failed = true;
        this.onAllDone();
    },

    onAllDone: function() {
        this.arch.unregisterPlan(this);
        this.emit('allDone');
    },

    allDone: function() {
        return (!this.locked &&
            !this.jobs.length &&
            !this.activeJobs.length &&
            !this.children[this.root].length);
    },

    toString: function() {
        return 'Plan[' + this.id + ']:\n' + this.nodeToString(this.root, ' ');
    },

    nodeToString: function(id, spaces) {
        var children = this.children[id] || [],
            s = spaces + id + '\n';

        for (var i = 0; i < children.length; i++) {
            s += spaces + this.nodeToString(children[i], spaces + ' ');
        }

        return s;
    }

});
