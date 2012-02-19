var util = require('./util.js'),
    planIDSequence = 0;

function Plan(graph, root, id) {
    var P = this;

    P.id = id;
    P.graph = graph;
    P.root = root || '__plan_' + P.id + '_root__';

    P.parents = {};
    P.children = {};
    P.children[P.root] = [];

    P.jobs = [];
    P.activeJobs = {};

    P.locked = false;
}

exports.newPlan = function(graph, root, id) {
    return new Plan(graph, root, id || planIDSequence++);
};

Plan.prototype.rescanJobs = function(ids) {
    var P = this,
        id;

    if (!Array.isArray(ids)) ids = [ids];

    for (var i = 0; i < ids.length; i++) {
        id = ids[i];
        P.removeJobs(P.parents[id]);
        if (!P.children[id].length) P.addJob(id);
    }
};

Plan.prototype.removeJobs = function(ids) {
    var P = this,
        j;

    if (ids && ids.length) {
        for (var i = 0; i < ids.length; i++) {
            P.removeJob(ids[i]);
        }
    }
};

Plan.prototype.removeJob = function(id) {
    var P = this,
        i = P.jobs.indexOf(id);
    if (i !== -1) P.jobs.splice(i, 1);
};

Plan.prototype.hasMoreJobs = function() {
    return this.jobs.length > 0;
};

Plan.prototype.nextJob = function() {
    var P = this, job;
    if (!P.locked && (job = P.jobs.shift())) {
        P.activeJobs[job] = true;
        return P.graph.getNode(job);
    }
};

Plan.prototype.link = function(children, parents) {
    var P = this;

    if (!Array.isArray(children)) children = [children];
    if (!parents) {
        parents = [P.root];
    } else if (!Array.isArray(parents)) {
        parents = [parents];
    }

    for (var i = 0; i < children.length; i++) {
        for (var j = 0; j < parents.length; j++) {
            P._link(children[i], parents[j]);
        }
    }

    P.rescanJobs(children);
};

Plan.prototype._link = function(child, parent) {
    var P = this;

    if (!parent) parent = P.root;

    if (!P.parents[child]) P.parents[child] = [];
    if (!P.parents[parent]) P.parents[parent] = [];
    if (!P.children[child]) P.children[child] = [];
    if (!P.children[parent]) P.children[parent] = [];

    var children = P.children[parent],
        parents = P.parents[child];

    if (children.indexOf(child) === -1) children.push(child);
    if (parents.indexOf(parent) === -1) parents.push(parent);

    P.children[parent] = children;
    P.parents[child] = parents;
};

Plan.prototype.unlink = function(id1, id2) {
    var P = this,
        parents1 = P.parents[id1],
        parents2 = P.parents[id2];

    if (parents1 && parents2) {
        util.unlink(parents1, P.children[id1], id2);
        util.unlink(parents2, P.children[id2], id1);

        if (!parents1.length) P.link(id1, P.root);
        if (!parents2.length) P.link(id2, P.root);
    }

    P.rescanJobs([id1, id2]);
};

Plan.prototype.removeNode = function(id) {
    var P = this,
        parents = P.parents[id],
        children = P.children[id];

    util.removeNode(parents, P.children, id);
    util.removeNode(children, P.parents, id);

    for (var i = 0; i < children.length; i++) {
        if (!P.parents[children[i]].length) P.link(children[i], P.root);
    }

    P.rescanJobs(parents.concat(children));
};

Plan.prototype.addJob = function(id) {
    this.jobs.push(id);
};

Plan.prototype.lock = function(id) {
    this.locked = true;
};

Plan.prototype.unlock = function(id) {
    this.locked = false;
};

Plan.prototype.finished = function(id) {
    var P = this,
        parents = P.parents[id],
        children,
        pID;

    for (var i = 0; i < parents.length; i++) {
        pID = parents[i];
        children = P.children[pID];
        children.splice(children.indexOf(id), 1);
        if (!children.length && pID !== P.root) P.addJob(pID);
    }

    delete P.parents[id];
    delete P.activeJobs[id];
};

Plan.prototype.toString = function() {
    var P = this;

    return 'Plan[' + P.id + ']:\n' + P.node2string(P.root, ' ');
};

Plan.prototype.node2string = function(id, spaces) {
    var P = this,
        children = P.children[id] || [],
        s = spaces + id + '\n';

    for (var i = 0; i < children.length; i++) {
        s += spaces + P.node2string(children[i], spaces + ' ');
    }

    return s;
};

Plan.prototype.allDone = function() {
    var P = this;
    return (!P.locked && !P.jobs.length && !P.children[P.root].length);
};
