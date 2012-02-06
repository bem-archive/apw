var nodeIDSequence = 0;

function Node(value, run, id) {
    this.id = id || nodeIDSequence++;
    this.value = value;
    this.run = run;

    this.parents = [];
    this.children = [];
}

var newNode = exports.newNode = function(value, run, id) {
    return new Node(value, run, id);
};

Node.prototype.addParent = function(node, registerChild) {
    this.parents.push(node);
    if (registerChild) {
        node.addChild(this);
    }
    return node;
};

Node.prototype.addChild = function(node, registerParent) {
    this.children.push(node);
    if (registerParent) {
        node.addParent(this);
    }
    return node;
};

Node.prototype.copy = function() {
    var N = this;
    return newNode(N.value, N.run, N.id);
};

Node.prototype.toString = function() {
    return '  Node[' + this.id + ']: ' + this.value;
};

Node.prototype.toStringAll = function(spaces) {
    var s = spaces + 'Node[' + this.id + ']: ' + this.value;
    if (this.parents.length) {
        s += ' // parents:';
        this.parents.forEach(function(parent) {
            s += ' ' + parent.id;
        });
    }
    this.children.forEach(function(child) {
        s += '\n' + child.toStringAll(spaces + '  ');
    });
    return s;
};
