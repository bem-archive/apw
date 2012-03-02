var VOWS = require('vows'),
	assert = require('assert'),
    suite = VOWS.describe('Graph'),
    CORE = require('../lib/core.js');

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

suite
    .addBatch({
        'Simple set/get': {
            topic: function() {
                var graph = getEmptyGraph();
                
                graph.setNode('A', { run: 'testA' });
                graph.setNode('B', { run: 'testB' }, 'A');
                
                return graph;
            },
            'getNode() A': function(graph) {
                var node = graph.getNode('A');
                
                assert.equal(node.id, 'A');
                assert.equal(node.node.run, 'testA');
            },
            'getNode() default': function(graph) {
                var node = graph.getNode('XXX');
                
                assert.equal(node.id, 'XXX');
            },
            'getChildrenIds() A': function(graph) {
                var children = graph.getChildrenIds('A');
                
                assert.lengthOf(children, 1);
                assert.equal(children[0], 'B');
            },
            'getParentsIds() B': function(graph) {
                var parents = graph.getParentsIds('B');
                
                assert.lengthOf(parents, 1);
                assert.equal(parents[0], 'A');
            }
        },

        'Node availability check': {
            topic: function() {
                var graph = getEmptyGraph();
                
                graph.setNode('A', { run: 'testA' });
                
                return graph;
            },
            'hasNode() A': function(graph) {
                assert.equal(graph.hasNode('A'), true);
            },
            'hasNode() absent': function(graph) {
                assert.equal(graph.hasNode('XXX'), false);
            }
        },

        'Node removal': {
            topic: function() {
                var graph = getEmptyGraph();
                
                graph.setNode('A', { run: 'testA' });
                graph.setNode('B', { run: 'testB' }, 'A');
                
                return graph;
            },
            'removeNode() leaf B': function(graph) {
                assert.equal(graph.hasNode('B'), true);

                graph.removeNode('B');

                assert.equal(graph.hasNode('B'), false);
                assert.lengthOf(graph.getChildrenIds('A'), 0);
            },
            'removeNode() node A': function(graph) {
                assert.equal(graph.hasNode('A'), true);
                assert.lengthOf(graph.getParentsIds('B'), 1);
                assert.equal(graph.getParentsIds('B')[0], 'A');

                graph.removeNode('A');

                assert.equal(graph.hasNode('A'), false);
                assert.lengthOf(graph.getParentsIds('B'), 0);
            },
            'removeNode() absent': function(graph) {
                assert.equal(graph.hasNode('XXX'), false);

                graph.removeNode('XXX');
            }
        }

    });

suite.export(module);