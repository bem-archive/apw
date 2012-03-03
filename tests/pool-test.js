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

    graph.setNode('0A', { run: function() { state.push('0A') } });
    
    graph.setNode('1A', { run: function() { state.push('1A') } });
    graph.setNode('1B', { run: function() { state.push('1B') } }, '1A');
    
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
        'Run plan: A': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getRunner(getSimpleGraph(state), true).process('0A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                )
            },
            'correct run': function(error, state) {
                assert.isNull(error);
                assert.lengthOf(state, 1);
                assert.equal(state[0], '0A');
            }            
        },
        'Run plan: A -> B': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getRunner(getSimpleGraph(state), true).process('1A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                )
            },
            'correct run order': function(error, state) {
                assert.isNull(error);
                assert.lengthOf(state, 2);
                assert.equal(state[0], '1B');
                assert.equal(state[1], '1A');
            }
        }
    });

suite.export(module);