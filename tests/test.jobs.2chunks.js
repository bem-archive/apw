var maxWorkers = 3,
    chunks = require('../lib/parts/chunks.js').newChunks(maxWorkers),
    graph = require('../lib/parts/graph.js').newGraph(),
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

var a = graph.addNode(newNode('A', function(cb) { console.log('run(A)'); cb(10) })),
    b = graph.addNode(newNode('B', function(cb) { console.log('run(B)'); cb(20) })),
    f1 = graph.addNode(newNode('F1', function(cb) { console.log('run(F1)'); cb(30) })),
    c = graph.addNode(newNode('C', function(cb) { console.log('run(C)'); cb(40) }), a),
    d1 = graph.addNode(newNode('D1', function(cb) { console.log('run(D1)'); cb(50) }), c),
    d2 = graph.addNode(newNode('D2', function(cb) { console.log('run(D2)'); cb(60) }), d1),
    e1 = graph.addNode(newNode('E1', function(cb) { console.log('run(E1)'); cb(70) }), c),
    e2 = graph.addNode(newNode('E2', function(cb) { console.log('run(E2)'); cb(80) }), e1),
    f2 = graph.addNode(newNode('F2', function(cb) { console.log('run(F2)'); cb(90) }), f1);

c.addParent(b, true);
e1.addParent(f2, true);

chunks.fillChunks(graph.getSubGraph(c, f2));
console.log('=========\nINITIAL CHUNKS\n---------');
console.log(chunks.toString());
console.log('=========\nRUN JOBS\n---------');
chunks.run();