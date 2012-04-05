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

suite
    .addBatch({
        'Jobs': {
            topic: function() {
                return getSimpleArch().createPlan('A').nextJob();
            },
            'nextJob()': function(job) {
                assert.equal(job.id, 'C');
            }
        },

        'Operability': {
            topic: function() {
                return getSimpleArch().createPlan('A');
            },
            'isOperable() default': function(plan) {
                assert.equal(plan.isOperable(), true);
            },
            'allDone() default': function(plan) {
                assert.equal(plan.allDone(), false);
            }
        }

    });

suite.export(module);
