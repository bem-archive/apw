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
    
    graph.setNode('2A', { run: function() { state.push('2A') } });
    graph.setNode('2B', {
        run: function(ctx) {
            state.push('2B');
            ctx.graph.setNode('2C', { run: function() { state.push('2C') } }, '2A');
            ctx.graph.setNode('2D', { run: function() { state.push('2D') } }, '2A');
        }
    }, '2A');

    graph.setNode('3A', { run: function() { state.push('3A') } });
    graph.setNode('3B', {
        run: function(ctx) {
            state.push('3B');
            ctx.graph.withLock(function() {
                ctx.graph.setNode('3C', { run: function() { state.push('3C') } }, '3A');
                ctx.graph.setNode('3D', { run: function() { state.push('3D') } }, '3A');
            });
        }
    }, '3A');

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
        },
        'Run plan without lock (TODO: should we throw error?): A -> B* -> (A -> C, A -> D)': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getRunner(getSimpleGraph(state), true).process('2A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                )
            },
            'correct plan update on-the-fly': function(error, state) {
                assert.isNull(error);
                assert.lengthOf(state, 4);
                assert.equal(state[0], '2B');
                if (state[1] === '2C') assert.equal(state[2], '2D');
                if (state[1] === '2D') assert.equal(state[2], '2C');
                assert.equal(state[3], '2A');
            }
        },
        'Run plan with lock: A -> B* -> (A -> C, A -> D)': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getRunner(getSimpleGraph(state), true).process('3A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                )
            },
            'correct plan update on-the-fly': function(error, state) {
                assert.isNull(error);
                assert.lengthOf(state, 4);
                assert.equal(state[0], '3B');
                if (state[1] === '3C') assert.equal(state[2], '3D');
                if (state[1] === '3D') assert.equal(state[2], '3C');
                assert.equal(state[3], '3A');
            }
        }
    });

suite.export(module);