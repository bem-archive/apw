var VOWS = require('vows'),
    assert = require('assert'),
    suite = VOWS.describe('Pool'),
    CORE = require('../lib/core.js');

function getEmptyPool(maxWorkers, ctx) {
    ctx = ctx || {
        method: 'run',
        verbose: true,
        force: true
    };
    return new CORE.Pool(maxWorkers, ctx);
}

suite
    .addBatch({
        'Empty pool': {
            topic: function() {
                return getEmptyPool();
            },
            'start()': function(pool) {
                pool.start();
            }
        }

    });

suite.export(module);