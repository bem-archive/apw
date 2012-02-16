var graph = require('../lib/parts/graph.js').newGraph();

/*

 A - B - C

*/

graph.setNode({}, 'A');
graph.setNode({}, 'B', ['A']);
graph.setNode({}, 'C', ['B']);

var plan = graph.createPlan('A');

console.log('== BEFORE REMOVE(B) ==');
console.log(plan.toString());
graph.removeNode('B');
console.log('== AFTER REMOVE(B) ==');
console.log(plan.toString());