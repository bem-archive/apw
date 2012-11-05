var Q = require('q'),
    APW = require('..'),
    ASSERT = require('assert');

/**
 * Mocha BDD interface.
 */
/** @name describe @function */
/** @name it @function */
/** @name before @function */
/** @name after @function */
/** @name beforeEach @function */
/** @name afterEach @function */

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
            run: function() {
                state.push('2B');
                this.ctx.arch.addNode(createNode('2C'), '2A');
                this.ctx.arch.addNode(createNode('2D'), '2A');
            }
        }, '2A')

        .addNode(createNode('3A'))
        .addNode({
            getId: function() {
                return '3B';
            },
            run: function() {
                state.push('3B');
                return this.ctx.arch.withLock(function() {
                    this.ctx.arch.addNode(createNode('3C'), '3A');
                    this.ctx.arch.addNode(createNode('3D'), '3A');
                }, this);
            }
        }, '3A')

        .addNode(createNode('4A'))
        .addNode(createNode('4B'), '4A')
        .addNode(createNode('4C'), '4B')

        .addNode(createNode('5A'))
        .addNode({
            getId: function() {
                return '5B';
            },
            run: function() {
                this.ctx.plan.on('allDone', function(id) {
                    state.push('5B');
                });
            }
        }, '5A');
}

function getAPW(arch) {
    return new APW(arch);
}

describe('Run plan: A', function() {
    it('correct run', function(done) {
        var state = [];
        Q.when(getAPW(getArch(state)).process('0A'),
            function() {
                ASSERT.equal(state.length, 1);
                ASSERT.equal(state[0], '0A');
                done();
            }, done
        ).end();
    });
});

describe('Run plan: A -> B', function() {
    it('correct run order', function(done) {
        var state = [];
        Q.when(getAPW(getArch(state)).process('1A'),
            function() {
                ASSERT.equal(state.length, 2);
                ASSERT.equal(state[0], '1B');
                ASSERT.equal(state[1], '1A');
                done();
            }, done
        ).end();
    });
});

describe('Run plan without lock (TODO: should we throw error?): A -> B* -> (A -> C, A -> D)', function() {
    it('correct run order', function(done) {
        var state = [];
        Q.when(getAPW(getArch(state)).process('2A'),
            function() {
                ASSERT.equal(state.length, 4);
                ASSERT.equal(state[0], '2B');
                if (state[1] === '2C') ASSERT.equal(state[2], '2D');
                if (state[1] === '2D') ASSERT.equal(state[2], '2C');
                ASSERT.equal(state[3], '2A');
                done();
            }, done
        ).end();
    });
});

describe('Run plan with lock: A -> B* -> (A -> C, A -> D)', function() {
    it('correct run order', function(done) {
        var state = [];
        Q.when(getAPW(getArch(state)).process('3A'),
            function() {
                ASSERT.equal(state.length, 4);
                ASSERT.equal(state[0], '3B');
                if (state[1] === '3C') ASSERT.equal(state[2], '3D');
                if (state[1] === '3D') ASSERT.equal(state[2], '3C');
                ASSERT.equal(state[3], '3A');
                done();
            }, done
        ).end();
    });
});

describe('Run plans on same node', function() {
    it('test', function(done) {
        var state = [],
            arch = getArch(state),
            apw = getAPW(arch);

        apw.workers.addPlan(arch.createPlan('4A'));

        Q.when(apw.process('4B'),
            function() {
                done();
            }, done
        ).end();
    });
});

describe('All done subscribers', function() {
    it('allDone subscribers fired', function(done) {
        var state = [];
        Q.when(getAPW(getArch(state)).process('5A'),
            function() {
                ASSERT.equal(state.length, 2);
                ASSERT.equal(state[0], '5A');
                ASSERT.equal(state[1], '5B');
                done();
            }, done
        ).end();
    });
});
