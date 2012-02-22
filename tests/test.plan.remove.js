var graph = new (require('..').Graph)();

/*

 A - B - C - D

*/

graph.setNode('A', {});
graph.setNode('B', {}, ['A']);
graph.setNode('C', {}, ['B']);
graph.setNode('D', {}, ['C']);

var plan = graph.createPlan('A');

console.log('== BEFORE REMOVE(B) ==');
console.log(plan.toString());
graph.removeNode('B');
console.log('== AFTER REMOVE(B) ==');
console.log(plan.toString());
