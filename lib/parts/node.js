var nodeIDSequence = 0;

function Node(value, run) {
    this.id = nodeIDSequence++;
    this.value = value;
    this.run = run;

    this.parents = [];
    this.children = [];
}

exports.newNode = function(value, run) {
    return new Node(value, run);
};

Node.prototype.addParent = function(node) {
    this.parents.push(node);
    node.addChild(this);
    return node;
};

Node.prototype.addChild = function(node) {
    this.children.push(node);
    return node;
};

Node.prototype.toString = function() {
    return '    Node[' + this.id + ']: ' + this.value;
};