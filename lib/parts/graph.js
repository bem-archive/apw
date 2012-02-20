var util = require('./util.js'),
    Plan = require('./plan'),
    nodeIDSequence = 0;

function Graph() {
    var G = this;

    G.nodes = {};
    G.parents = {};
    G.children = {};
    G.plans = {};
}

exports.newGraph = function() {
    return new Graph();
};

Graph.prototype.setNode = function(node, id, parents, children) {
    var G = this;

    if (!id) id = (node.getId && node.getId())? node.getId() : nodeIDSequence++;

    G.nodes[id] = node;
    G.parents[id] = [];
    G.children[id] = [];

    if (parents) G.link([id], parents);
    if (children) G.link(children, [id]);

    return id;
};

Graph.prototype.hasNode = function(id) {
    return !!this.nodes[id];
};

Graph.prototype.getNode = function(id) {
    var G = this;

    return G.hasNode(id) ? { id: id, node: G.nodes[id] } : G.getDefaultNode(id);
};

Graph.prototype.getDefaultNode = function(id) {
    return {
        id: id,
        node: {
            getId: function() {
                return id;
            },

            run: function() {
                throw Error("** No rule to make target '" + id + "'");
            }
        }
    };
};

Graph.prototype.link = function(children, parents) {
    var G = this;

    if (!Array.isArray(children)) children = [children];
    if (!Array.isArray(parents)) parents = [parents];

    for (var i = 0; i < children.length; i++) {
        G._link(children[i], parents);
    }
};

Graph.prototype._link = function(child, parents) {
    var G = this,
        _parents = G.parents[child],
        parent,
        children;

    for (var i = 0; i < parents.length; i++) {
        parent = parents[i];
        children = G.children[parent];

        if (_parents.indexOf(parent) === -1) _parents.push(parent);
        if (children.indexOf(child) === -1) children.push(child);

        for (var k in G.plans) {
            G.plans[k].link(child, parent);
        }
    }
};

Graph.prototype.unlink = function(id1, id2) {
    var G = this;

    util.unlink(G.parents[id1], G.children[id1], id2);
    util.unlink(G.parents[id2], G.children[id2], id1);

    for (var k in G.plans) {
        G.plans[k].unlink(id1, id2);
    }
};

Graph.prototype.removeNode = function(id) {
    var G = this,
        parents = G.parents[id],
        children = G.children[id];

    util.removeNode(parents, G.children, id);
    util.removeNode(children, G.parents, id);

    delete G.nodes[id];

    for (var k in G.plans) {
        G.plans[k].removeNode(id);
    }
};

Graph.prototype.createPlan = function(/* ids */) {
    var G = this,
        ids = G._getIDs(arguments),
        plan = newPlan(G, '__plan_root__');

    G.plans[plan.id] = plan;

    for (var id in ids) {
        plan.link(id);
        G.gatherIDs(id, plan);
    }

    return plan;
};

Graph.prototype.gatherIDs = function(id, plan) {
    var G = this,
        children = G.children[id] || [];

    for (var i = 0; i < children.length; i++) {
        plan.link(children[i], id);
        G.gatherIDs(children[i], plan);
    }
};

Graph.prototype._getIDs = function(args) {
    if (args.length) {
        if (Array.isArray(args[0])) {
            return util.arrayToObject(args[0]);
        } else {
            var ids = {};
            for (var i in args) ids[args[i]] = 1;
            return ids;
        }
    }

    return {};
};

Graph.prototype.toString = function() {
    var G = this,
        s = 'Graph:\n',
        roots = G.findRoots();

    for (var j = 0; j < roots.length; j++) {
        s += '== root\n' + G.node2string(roots[j], ' ');
    }

    return s;
};

Graph.prototype.node2string = function(id, spaces) {
    var G = this,
        children = G.children[id],
        s = spaces + id + '\n';

    for (var i = 0; i < children.length; i++) {
        s += spaces + G.node2string(children[i], spaces + ' ');
    }

    return s;
};

Graph.prototype.findRoots = function() {
    var G = this,
        roots = [];

    for (var id in G.parents) {
        if (!G.parents[id].length) {
            roots.push(id);
        }
    }

    return roots;
};
