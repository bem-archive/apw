var graph = require('../lib/parts/graph.js').newGraph();

/*

 A - B - C - D

*/

graph.setNode({}, 'A');
graph.setNode({}, 'B', ['A']);
graph.setNode({}, 'C', ['B']);
graph.setNode({}, 'D', ['C']);

var plan = graph.createPlan('A');

console.log('== BEFORE UNLINK(A, B) ==');
console.log(plan.toString());
graph.unlink('A', 'B');
console.log('== AFTER UNLINK(A, B) ==');
console.log(plan.toString());