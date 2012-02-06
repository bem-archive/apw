var maxWorkers = 3,
    chunks = require('../lib/parts/chunks.js').newChunks(maxWorkers),
    graph = require('../lib/parts/graph.js').newGraph(),
    newNode = require('../lib/parts/node.js').newNode;

/*

 A1
 |
 A2
 |
 A3

*/

var a1 = graph.addNode(newNode('A1', function(cb) { console.log('run(A1)'); cb(10) })),
    a2 = graph.addNode(newNode('A2', function(cb) { console.log('run(A2)'); cb(20) }), a1),
    a3 = graph.addNode(newNode('A3', function(cb) { console.log('run(A3)'); cb(30) }), a2);

chunks.fillChunks(graph.getSubGraph(a1));
console.log('=========\nINITIAL CHUNKS\n---------');
console.log(chunks.toString());
console.log('=========\nRUN JOBS\n---------');
chunks.run();