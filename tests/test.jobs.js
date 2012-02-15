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

graph.setNode({ run: function(cb) { console.log('A: run'); cb(10) }}, 'A');
graph.setNode({ run: function(cb) { console.log('B: run'); cb(20) }}, 'B');
graph.setNode({ run: function(cb) { console.log('C: run'); cb(30) }}, 'C', ['A', 'B']);
graph.setNode({ run: function(cb) { console.log('D1: run'); cb(40) }}, 'D1', ['C']);
graph.setNode({ run: function(cb) { console.log('D2: run'); cb(50) }}, 'D2', ['D1']);
graph.setNode({ run: function(cb) { console.log('E1: run'); cb(60) }}, 'E1', ['C']);
graph.setNode({ run: function(cb) { console.log('E2: run'); cb(70) }}, 'E2', ['E1']);
graph.setNode({ run: function(cb) { console.log('X: run'); cb(80) }}, 'X');

var plan = graph.createPlan('C'),
    jobs = newJobs(plan, 3, function() {
        console.log('finished');
    });

console.log('== WHOLE GRAPH ==');
console.log(graph.toString());
console.log('== PLAN (C) ==');
console.log(plan.toString());
console.log('== RUN JOBS ==');

jobs.start();
console.log('started');
