var Q = require('qq'),
    graph = require('../lib/parts/graph.js').newGraph(),
    newJobs = require('../lib/parts/jobs.js').newJobs;

/*

 A   B  X (single node)
  \ /
   C
  / \
 D1  E1
 |   |
 D2  E2

*/

graph.setNode({ run: function() { console.log('A: run'); }}, 'A');
graph.setNode({ run: function() { console.log('B: run'); }}, 'B');
graph.setNode({ run: function() { console.log('C: run'); }}, 'C', ['A', 'B']);
graph.setNode({ run: function() { console.log('D1: run'); }}, 'D1', ['C']);
graph.setNode({ run: function() { console.log('D2: run'); }}, 'D2', ['D1']);
graph.setNode({ run: function() { console.log('E1: run'); }}, 'E1', ['C']);
graph.setNode({ run: function() { console.log('E2: run'); }}, 'E2', ['E1']);
graph.setNode({}, 'E3', ['E2']);
graph.setNode({ run: function() { console.log('X: run'); }}, 'X');

var plan = graph.createPlan('C'),
    jobs = newJobs(plan, 3);

console.log('== WHOLE GRAPH ==');
console.log(graph.toString());
console.log('== PLAN (C) ==');
console.log(plan.toString());
console.log('== RUN JOBS ==');

jobs.start().then(function() {
    console.log('finished');
});
console.log('started');
