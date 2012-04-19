var Q = require('qq'),
    VOWS = require('vows'),
    assert = require('assert'),
    suite = VOWS.describe('Workers'),
    APW = require('../lib/apw');

function getSimpleArch(state) {
    var arch = new APW.Arch();

    arch.setNode('0A', { run: function() { state.push('0A') } });
    
    arch.setNode('1A', { run: function() { state.push('1A') } });
    arch.setNode('1B', { run: function() { state.push('1B') } }, '1A');
    
    arch.setNode('2A', { run: function() { state.push('2A') } });
    arch.setNode('2B', {
        run: function(ctx) {
            state.push('2B');
            ctx.arch.setNode('2C', { run: function() { state.push('2C') } }, '2A');
            ctx.arch.setNode('2D', { run: function() { state.push('2D') } }, '2A');
        }
    }, '2A');

    arch.setNode('3A', { run: function() { state.push('3A') } });
    arch.setNode('3B', {
        run: function(ctx) {
            state.push('3B');
            return ctx.arch.withLock(function() {
                ctx.arch.setNode('3C', { run: function() { state.push('3C') } }, '3A');
                ctx.arch.setNode('3D', { run: function() { state.push('3D') } }, '3A');
            });
        }
    }, '3A');

    arch.setNode('4A', { run: function() { state.push('4A') } });
    arch.setNode('4B', {
        run: function(ctx) {
            ctx.plan.on('allDone', function(id) {
                state.push('4B');
            });
        }
    }, '4A');

    arch.setNode('5A', {
        run: function(ctx) {
            state.push(ctx.plan);
        }
    });
    arch.setNode('5B', {
        run: function(ctx) {
            ctx.plan.lock();
            ctx.plan.link('5D', '5C');
            ctx.plan.unlock();
        }
    }, '5A');
    arch.setNode('5C', { run: function() {} }, '5B');
    arch.setNode('5D', { run: function() {} }, '5C');

    arch.setNode('6A', {
        run: function(ctx) {
            state.push(ctx.plan);
        }
    });
    arch.setNode('6B', { run: function() {} }, '6A');
    arch.setNode('6C', { run: function() {} }, '6A');
    arch.setNode('6D', { run: function() {} }, '6B');
    arch.setNode('6E', {
        run: function(ctx) {
            ctx.plan.lock();
            ctx.plan.link('6C', '6B');
            ctx.plan.unlock();
        }
    }, ['6B', '6C']);
    arch.setNode('6F', { run: function() {} }, '6D');
    arch.setNode('6G', { run: function() {} }, '6D');
    arch.setNode('6H', { run: function() {} }, '6E');
    arch.setNode('6I', { run: function() {} }, '6H');

    return arch;
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
                    getAPW(getSimpleArch(state)).process('0A'),
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
                    getAPW(getSimpleArch(state)).process('1A'),
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
                    getAPW(getSimpleArch(state)).process('2A'),
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
                    getAPW(getSimpleArch(state)).process('3A'),
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
        },

        'Do not link done node (simple plan)': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getAPW(getSimpleArch(state)).process('5A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                )
            },
            'there are no double done jobs': function(error, state) {
                var plan = state[0];
                assert.isNull(error);
                assert.lengthOf(plan.doneJobs, 4);
                ['5A', '5B', '5C', 'D']
                    .forEach(function(id) {
                        assert.equal(plan.hasNode(id), false, 'has ID: ' + id);
                    });
            }
        },

        'Do not link done node (partly done subarch)': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getAPW(getSimpleArch(state)).process('6A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                )
            },
            'there are no double done jobs': function(error, state) {
                var plan = state[0];
                assert.isNull(error);
                assert.lengthOf(plan.doneJobs, 9);
                ['6A', '6B', '6C', '6D', '6E', '6F', '6G', '6H', '6I']
                    .forEach(function(id) {
                        assert.equal(plan.hasNode(id), false, 'has ID: ' + id);
                    });
            }
        },

        'All done subscribers': {
            topic: function() {
                var _this = this,
                    state = [];
                Q.when(
                    getAPW(getSimpleArch(state)).process('4A'),
                    function(value) { _this.callback(null, state) },
                    function(error) { _this.callback(error, null) }
                )
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
