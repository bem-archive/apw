var graph = new (require('..').Graph)();

/*

 A   B  X (single node)
  \ /
   C
  / \
 D1  E1
 |   |
 D2  E2

*/

graph.setNode('A', {});
graph.setNode('B', {});
graph.setNode('C', {}, ['A', 'B']);
graph.setNode('D1', {}, ['C']);
graph.setNode('D2', {}, ['D1']);
graph.setNode('E1', {}, ['C']);
graph.setNode('E2', {}, ['E1']);
graph.setNode('X', {});

console.log('== ROOTS ==');
console.log(graph.findRoots().join(', '));
console.log('== WHOLE GRAPH ==');
console.log(graph.toString());
