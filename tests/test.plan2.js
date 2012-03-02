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
graph.setNode('D', { run: function() { console.log('D.run()') } }, 'B');

graph.setNode(
	'E',
	{
		run: function() {
			console.log('E.run()');
			graph.withLock(
				function() {
					graph.setNode('childD1', { run: function() { console.log('childD1.run()') } }, 'D');
					graph.setNode('childD2', { run: function() { console.log('childD2.run()') } }, 'D');
					graph.setNode('X', { run: function() { console.log('X.run()') } });
					graph.setNode('childX1', { run: function() { console.log('childX1.run()') } }, 'X');
					graph.setNode('childX2', { run: function() { console.log('childX1.run()') } }, 'X');
				},
				this
			);
		}
	},
	'D'
);

graph.setNode(
	'F',
	{
		run: function() {
			console.log('F.run()');
			graph.withLock(
				function() {
					graph.link('X', 'A');
				},
				this
			);
		}
	},
	'D'
);


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