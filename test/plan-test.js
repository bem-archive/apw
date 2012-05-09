var VOWS = require('vows'),
    assert = require('assert'),
    suite = VOWS.describe('Plan'),
    APW = require('../lib/apw');

function createNode(id) {
    return {

        getId: function() {
            return id;
        },

        run: function() {
            return 'test' + id;
        }

    };
}

function getEmptyArch() {
    return new APW.Arch();
}

function getSimpleArch() {
    return getEmptyArch()
        .addNode(createNode('A'))
        .addNode(createNode('B'), 'A')
        .addNode(createNode('C'), 'B');
}

function getPlan() {
    return getSimpleArch().createPlan('A');
}

suite
    .addBatch({
        'Jobs': {
            topic: function() {
                return getPlan().nextJob();
            },
            'nextJob()': function(job) {
                assert.equal(job.id, 'C');
            }
        },

        'Operability': {
            topic: getPlan,
            'isOperable() default': function(plan) {
                assert.equal(plan.isOperable(), true);
            },
            'allDone() default': function(plan) {
                assert.equal(plan.allDone(), false);
            }
        },
                                                                                                                                                                    
        'Node removal (leaf)': {
            topic: getPlan,
            'removeNode() leaf B': function(plan) {
                assert.equal(plan.hasNode('B'), true);

                plan.removeNode('B');

                assert.equal(plan.hasNode('B'), false);
            }
        },

        'Node removal (node)': {
            topic: getPlan,
            'removeNode() node A': function(plan) {
                assert.equal(plan.hasNode('A'), true);

                plan.removeNode('A');

                assert.equal(plan.hasNode('A'), false);
            }
        },

        'Remove tree (simple plan) unforced': {
            topic: function() {
                var arch = getEmptyArch()
                    .addNode(createNode('A'))
                    .addNode(createNode('B'), 'A')
                    .addNode(createNode('C'), 'A')
                    .addNode(createNode('D'), ['B', 'C']),

                    plan = arch.createPlan('A');

                arch.removeTree('C');

                return plan;
            },
            'removeTree() C unforced': function(plan) {
                assert.equal(plan.hasChildren('A', 'B'), true);
                assert.equal(plan.hasChildren('A', 'C'), false);
                assert.equal(plan.hasChildren('B', 'D'), true);
                assert.equal(plan.hasNode('C'), false);
            }
        },

        'Remove tree (simple plan) forced': {
            topic: function() {
                var arch = getEmptyArch()
                    .addNode(createNode('A'))
                    .addNode(createNode('B'), 'A')
                    .addNode(createNode('C'), 'A')
                    .addNode(createNode('D'), ['B', 'C']),

                    plan = arch.createPlan('A');

                arch.removeTree('C', true);

                return plan;
            },
            'removeTree() C forced': function(plan) {
                assert.equal(plan.hasChildren('A', 'B'), true);
                assert.equal(plan.hasChildren('A', 'C'), false);
                assert.equal(plan.hasChildren('B', 'D'), false);
                assert.equal(plan.hasNode('C'), false);
                assert.equal(plan.hasNode('D'), false);
            }
        },

        'Lock': {
            topic: function() {
                var plan = getSimpleArch().createPlan('A');

                plan.lock();
                plan.lock();

                return plan;
            },
            'lock() / unlock()': function(plan) {
                assert.equal(plan.locked, 2);
                plan.unlock();
                assert.equal(plan.locked, 1);
                plan.unlock();
                assert.equal(plan.locked, 0);
                plan.unlock();
                assert.equal(plan.locked, 0);
            }
        }

    });

suite.export(module);
