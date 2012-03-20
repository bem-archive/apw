var INHERIT = require('inherit'),
    Workers = require('./workers');

module.exports = INHERIT({

    __constructor: function(arch /*, maxWorkers, ctx*/) {
        var maxWorkers = arguments[1],
            ctx = arguments[2];

        this.arch = arch;

        if (arguments.length == 2) {
            if (!isFinite(maxWorkers)) {
                maxWorkers = undefined;
                ctx = arguments[1];
            }
        }

        this.workers = new Workers(maxWorkers, ctx);
    },

    process: function(targets) {
        return this.workers.start(this.arch.createPlan(targets));
    }

});
