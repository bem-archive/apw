var planIDSequence = 0;

function Plan(graph, root, id) {
    var P = this;

    P.id = id;
    P.graph = graph;
    P.root = root || '__plan_' + P.id + '_root__';

    P.parents = {};
    P.children = {};
    P.children[P.root] = [];

    P.jobs = [];

    P.locked = false;
}

exports.newPlan = function(graph, root, id) {
    return new Plan(graph, root, id || planIDSequence++);
};

Plan.prototype.rescanJobs = function() {
    var P = this,
        parents = P.parents,
        children = P.children,
        jobs = [];

    for (var id in parents) {
        if (!children[id].length) {
            jobs.push(id);
        }
    }

    P.jobs = jobs;
};

Plan.prototype.hasMoreJobs = function() {
    return this.jobs.length !== 0;
};

Plan.prototype.nextJob = function() {
    var G = this;
    if (!G.locked) return G.graph.getNode(G.jobs.shift());
};

Plan.prototype.link = function(child, parent) {
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

Plan.prototype.addJob = function(id) {
    this.jobs.push(id);
};

Plan.prototype.lock = function(id) {
    this.locked = true;
};

Plan.prototype.unlock = function(id) {
    var P = this;

    P.locked = false;
    P.jobs = P.rescanJobs();
};

Plan.prototype.finished = function(id, result) {
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

    delete parents[id];
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
