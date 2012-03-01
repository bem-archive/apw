var CORE = require('../lib/core.js'),
	graph = new getEmptyGraph(),
	ctx = {
            method: 'run',
            verbose: true,
            force: true
        },
	runner = CORE.Runner.create(graph, 2, ctx);

graph.setNode('A', { run: function() { console.log('A.run()') } });
graph.setNode('B', { run: function() { console.log('B.run()') } }, 'A');
graph.setNode('C', { run: function() { console.log('C.run()') } }, 'B');

runner.process('A');

function getEmptyGraph() {
    var graph = new CORE.Graph();
    graph.setNode({
        getId: function() {
            return 'all';
        },
        run: function() {
            console.error("** Nothing to be done for '%s'", this.getId());
        }
    });
    return graph;
}