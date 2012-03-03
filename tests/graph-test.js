var VOWS = require('vows'),
	assert = require('assert'),
    suite = VOWS.describe('Graph'),
    CORE = require('../lib/core.js');

function getEmptyGraph() {
    return new CORE.Graph();
}

function getSimpleGraph() {
    var graph = getEmptyGraph();
    
    graph.setNode('A', { run: 'testA' });
    graph.setNode('B', { run: 'testB' }, 'A');
    
    return graph;

}

suite
    .addBatch({
        'Node set / get': {
            topic: getSimpleGraph,
            'children': function(graph) {
                assert.lengthOf(graph.children['A'], 1);
                assert.equal(graph.children['A'][0], 'B');
                assert.lengthOf(graph.children['B'], 0);
            }, 
            'parents': function(graph) {
                assert.lengthOf(graph.parents['B'], 1);
                assert.equal(graph.parents['B'][0], 'A');
                assert.lengthOf(graph.parents['A'], 0);
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

        'Node removal (leaf)': {
            topic: getSimpleGraph,
            'removeNode() leaf B': function(graph) {
                assert.equal(graph.hasNode('B'), true);

                graph.removeNode('B');

                assert.equal(graph.hasNode('B'), false);
                assert.lengthOf(graph.getChildrenIds('A'), 0);
            }
        },

        'Node removal (node)': {
            topic: getSimpleGraph,        
            'removeNode() node A': function(graph) {
                assert.equal(graph.hasNode('A'), true);
                assert.lengthOf(graph.getParentsIds('B'), 1);
                assert.equal(graph.getParentsIds('B')[0], 'A');

                graph.removeNode('A');

                assert.equal(graph.hasNode('A'), false);
                assert.lengthOf(graph.getParentsIds('B'), 0);
            }
        },

        'Node removal (absent)': {
            topic: getSimpleGraph,
            'removeNode() absent': function(graph) {
                assert.equal(graph.hasNode('XXX'), false);

                graph.removeNode('XXX');
            }
        },

        'Node link': {
            topic: function() {
                var graph = getEmptyGraph();
                
                graph.setNode('A', { run: 'testA' });
                graph.setNode('B', { run: 'testA' });
                graph.link('B', 'A');
                
                return graph;
            },
            'link() B -> A': function(graph) {
                var children = graph.getChildrenIds('A');
                
                assert.lengthOf(children, 1);
                assert.equal(children[0], 'B');

                var parents = graph.getParentsIds('B');
                
                assert.lengthOf(parents, 1);
                assert.equal(parents[0], 'A');
            }            
        },

        'Node unlink': {
            topic: function() {
                var graph = getEmptyGraph();
                
                graph.setNode('A', { run: 'testA' });
                graph.setNode('B', { run: 'testA' }, 'A');
                graph.unlink('B', 'A');

                return graph;
            },
            'unlink() B - A': function(graph) {
                assert.lengthOf(graph.getChildrenIds('A'), 0);
                assert.lengthOf(graph.getParentsIds('B'), 0);
            }            
        }

    });

suite.export(module);