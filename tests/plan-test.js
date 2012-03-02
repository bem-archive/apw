var VOWS = require('vows'),
    assert = require('assert'),
    suite = VOWS.describe('Plan'),
    CORE = require('../lib/core.js');

function getEmptyGraph() {
    return new CORE.Graph();
}

function getFilledGraph() {
    var graph = getEmptyGraph();

    graph.setNode('A', { run: function() {} });
    graph.setNode('B', { run: function() {} }, 'A');
    graph.setNode('C', { run: function() {} }, 'B');

    return graph;
}

suite
    .addBatch({
        'Jobs': {
            topic: function() {
                return getFilledGraph().createPlan('A').nextJob();
            },
            'nextJob()': function(job) {
                assert.equal(job.id, 'C');
            }
        },

        'Operability': {
            topic: function() {
                return getFilledGraph().createPlan('A');
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