var newNode = require('./node.js').newNode;

function Graph(root) {
    var G = this;

    G.root = root || newNode('Graph auto root', function(){});
    G.nodes = {};
    G.nodes[G.root.id] = G.root;
}

exports.newGraph = function() {
    return new Graph();
};

Graph.prototype.addNode = function(node, parent) {
    var G = this;

    if (!parent) parent = G.root;

    parent.addChild(node, true);
    G.nodes[node.id] = node;

    return node;
};

Graph.prototype.getSubGraph = function(node /*, .., nodeN*/) {
    var G = this,
        ids = {},
        pseudoRoot = newNode('SubGraph auto root', function(){}),
        recreated = {};

    for (var i in arguments) {
        G.collectNodeIDs(arguments[i], ids);
    }

    for (i in arguments) {
        pseudoRoot.addChild(G.fillSubGraph(arguments[i], ids, recreated), true);
    }

    return pseudoRoot;
};

Graph.prototype.collectNodeIDs = function(node, ids) {
    for (var i = 0; i < node.children.length; i++) {
        var child = node.children[i];
        ids[child.id] = true;
        this.collectNodeIDs(child, ids);
    }
};

Graph.prototype.fillSubGraph = function(node, idsToLimit, recreated) {
    var nCopy = node.copy(),
        child,
        nChild;

    for (var i = 0; i < node.children.length; i++) {
        child = node.children[i];
        if (child.id in recreated) {
            nCopy.addChild(recreated[child.id], true);
        } else if (child.id in idsToLimit) {
            nChild = this.fillSubGraph(child, idsToLimit, recreated);
            recreated[nChild.id] = nChild;
            nCopy.addChild(nChild, true);
        }
    }

    return nCopy;
};

Graph.prototype.toString = function() {
    return 'Graph:\n' + this.root.toStringAll('  ');
};