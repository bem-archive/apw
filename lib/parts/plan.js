var INHERIT = require('inherit'),
    util = require('./util'),
    planIDSequence = 1;

module.exports = INHERIT({

    __constructor: function(graph, targets, root, id) {
        this.graph = graph;
        this.id = id || planIDSequence++;
        this.root = root || '__plan_' + this.id + '_root__';

        this.parents = {};
        this.children = {};
        this.children[this.root] = [];

        this.jobs = [];
        this.activeJobs = [];

        this.locked = false;

        this.graph.registerPlan(this);
        this.init(targets);
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
        var children = this.graph.children[id] || [];

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
            return this.graph.getNode(job);
        }
    },

    link: function(children, parents) {
        if (!Array.isArray(children)) children = [children];

        parents = parents || [this.root];
        if (!Array.isArray(parents)) parents = [parents];

        for (var i = 0; i < children.length; i++) {
            for (var j = 0; j < parents.length; j++) {
                this._link(children[i], parents[j]);
            }
        }

        this.rescanJobs(children);
    },

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

    removeNode: function(id) {
        var parents = this.parents[id],
            children = this.children[id];

        util.removeNode(parents, this.children, id);
        util.removeNode(children, this.parents, id);

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
        this.graph.unregisterPlan(this);
    },

    allDone: function() {
        return (!this.locked &&
            !this.jobs.length &&
            !this.activeJobs.length &&
            !this.children[this.root].length);
    },

    toString: function() {
        return 'Plan[' + this.id + ']:\n' + this._nodeToString(this.root, ' ');
    },

    _nodeToString: function(id, spaces) {
        var children = this.children[id] || [],
            s = spaces + id + '\n';

        for (var i = 0; i < children.length; i++) {
            s += spaces + this._nodeToString(children[i], spaces + ' ');
        }

        return s;
    }

});
