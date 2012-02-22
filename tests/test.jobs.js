var graph = new (require('..').Graph)(),
    Pool = require('..').Pool;

/*

 A   B  X (single node)
  \ /
   C
  / \
 D1  E1
 |   |
 D2  E2

*/

graph.setNode('A', { run: function() { console.log('A: run'); }});
graph.setNode('B', { run: function() { console.log('B: run'); }});
graph.setNode('C', { run: function() { console.log('C: run'); }}, ['A', 'B']);
graph.setNode('D1', { run: function() { console.log('D1: run'); }}, ['C']);
graph.setNode('D2', { run: function() { console.log('D2: run'); }}, ['D1']);
graph.setNode('E1', { run: function() { console.log('E1: run'); }}, ['C']);
graph.setNode('E2', { run: function() { console.log('E2: run'); }}, ['E1']);
graph.setNode('E3', {}, ['E2']);
graph.setNode('X', { run: function() { console.log('X: run'); }});

var plan = graph.createPlan('C'),
    pool = new Pool(plan, 3);

console.log('== WHOLE GRAPH ==');
console.log(graph.toString());
console.log('== PLAN (C) ==');
console.log(plan.toString());
console.log('== RUN JOBS ==');

pool.start().then(function() {
    console.log('finished');
});
console.log('started');
