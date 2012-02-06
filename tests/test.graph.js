var graph = require('../lib/parts/graph.js').newGraph(),
    newNode = require('../lib/parts/node.js').newNode;

/*

 A   B  F1
  \ /  / |
   C--/  F2
  / \   /
 D1  E1-
 |   |
 D2  E2

*/

var a = graph.addNode(newNode('A', function(){})),
    b = graph.addNode(newNode('B', function(){})),
    f1 = graph.addNode(newNode('F1', function(){})),
    c = graph.addNode(newNode('C', function(){}), a),
    d1 = graph.addNode(newNode('D1', function(){}), c),
    d2 = graph.addNode(newNode('D2', function(){}), d1),
    e1 = graph.addNode(newNode('E1', function(){}), c),
    e2 = graph.addNode(newNode('E2', function(){}), e1),
    f2 = graph.addNode(newNode('F2', function(){}), f1);

c.addParent(b, true);
e1.addParent(f2, true);

console.log('=========\nINITIAL\n---------');
console.log(graph.toString());
console.log('=========\nSUBGRAPH(B)\n---------');
console.log(graph.getSubGraph(b).toStringAll(''));
console.log('=========\nSUBGRAPH(C, F2)\n---------');
console.log(graph.getSubGraph(c, f2).toStringAll(''));
