var graph = require('../lib/parts/graph.js').newGraph();

/*

 A - B - C - D

*/

graph.setNode({}, 'A');
graph.setNode({}, 'B', ['A']);
graph.setNode({}, 'C', ['B']);
graph.setNode({}, 'D', ['C']);

console.log('== BEFORE REMOVE(B) ==');
console.log(graph.toString());
graph.removeNode('B');
console.log('== AFTER REMOVE(B) ==');
console.log(graph.toString());