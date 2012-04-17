var VOWS = require('vows'),
    assert = require('assert'),
    suite = VOWS.describe('Plan'),
    APW = require('../lib/apw');

function getSimpleArch() {
    var arch = new APW.Arch();

    arch.setNode('A', { run: function() {} });
    arch.setNode('B', { run: function() {} }, 'A');
    arch.setNode('C', { run: function() {} }, 'B');

    return arch;
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
