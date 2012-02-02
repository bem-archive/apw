var nodeIDSequence = 0;

function Node(value) {
    this.id = nodeIDSequence++;
    this.value = value;

    this.parents = [];
    this.children = [];
}

exports.newNode = function(value) {
    return new Node(value);
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