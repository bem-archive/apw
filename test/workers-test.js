var Q = require('qq'),
    VOWS = require('vows'),
    assert = require('assert'),
    suite = VOWS.describe('Workers'),
    APW = require('../lib/apw');

function getArch(state) {
    var createNode = function(id) {
            return {

                getId: function() {
                    return id;
                },

                run: function() {
                    state.push(id);
                }

            };
        };

    return new APW.Arch()
        .addNode(createNode('0A'))

        .addNode(createNode('1A'))
        .addNode(createNode('1B'), '1A')

        .addNode(createNode('2A'))
        .addNode({
            getId: function() {
                return '2B';
            },
            run: function(ctx) {
                state.push('2B');
                ctx.arch.addNode(createNode('2C'), '2A');
                ctx.arch.addNode(createNode('2D'), '2A');
            }
        }, '2A')

        .addNode(createNode('3A'))
        .addNode({
            getId: function() {
                return '3B';
            },
            run: function(ctx) {
                state.push('3B');
                return ctx.arch.withLock(function() {
                    ctx.arch.addNode(createNode('3C'), '3A');
                    ctx.arch.addNode(createNode('3D'), '3A');
                });
            }
        }, '3A')

        .addNode(createNode('4A'))
        .addNode({
            getId: function() {
                return '4B';
            },
            run: function(ctx) {
                ctx.plan.on('allDone', function(id) {
                    state.push('4B');
                });
            }
        }, '4A')

        .addNode(createNode('7A'))
        .addNode(createNode('7B'), '7A')
        .addNode(createNode('7C'), '7B');
}

function getAPW(arch) {
    return new APW(arch);
}

suite
    .addBatch({
        'Run plan: A': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getAPW(getArch(state)).process('0A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                ).end();
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
                    getAPW(getArch(state)).process('1A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                ).end();
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
                    getAPW(getArch(state)).process('2A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                ).end();
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
                    getAPW(getArch(state)).process('3A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                ).end();
            },
            'correct plan update on-the-fly': function(error, state) {
                assert.isNull(error);
                assert.lengthOf(state, 4);
                assert.equal(state[0], '3B');
                if (state[1] === '3C') assert.equal(state[2], '3D');
                if (state[1] === '3D') assert.equal(state[2], '3C');
                assert.equal(state[3], '3A');
            }
        },

        'Run plans on same node': {
            topic: function() {
                var _this = this,
                    state = [],
                    arch = getArch(state),
                    apw = getAPW(arch);

                apw.workers.addPlan(arch.createPlan('7A'));

                Q.when(
                    apw.process('7B'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                ).end();
            },
            'test': function(error, state) {
                assert.isNull(error);
            }
        },

        'All done subscribers': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getAPW(getArch(state)).process('4A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                ).end();
            },
            'allDone subscribers fired': function(error, state) {
                assert.isNull(error);
                assert.lengthOf(state, 2);
                assert.equal(state[0], '4A');
                assert.equal(state[1], '4B');
            }
        }
    });

suite.export(module);
