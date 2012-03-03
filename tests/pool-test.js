var Q = require('qq'),
    VOWS = require('vows'),
    assert = require('assert'),
    suite = VOWS.describe('Pool'),
    CORE = require('../lib/core.js');

function getEmptyGraph() {
    return new CORE.Graph();
}

function getSimpleGraph(state) {
    var graph = getEmptyGraph();
    
    graph.setNode('A', { run: function() { state.push('A') } });
    graph.setNode('B', { run: function() { state.push('B') } }, 'A');
    
    return graph;
}

function getRunner(graph, force, method, maxWorkers) {
    method = method || 'run';
    maxWorkers = maxWorkers || 2;

    return new CORE.Runner(
        graph,
        maxWorkers,
        {
            method: method,
            verbose: true,
            force: force
        }
    );
}

suite
    .addBatch({
        'Chain A -> B': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getRunner(getSimpleGraph(state), true).process('A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                )
            },
            'correct run order': function(error, state) {
                assert.isNull(error);
                assert.lengthOf(state, 2);
                assert.equal(state[0], 'B');
                assert.equal(state[1], 'A');
            }
        }
    });

suite.export(module);