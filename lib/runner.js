var INHERIT = require('inherit'),
    Workers = require('./workers');

module.exports = INHERIT({

    /**
     * Creates an instance of Runner.
     *
     * @constructor
     * @param {Arch} arch The Arch to work with.
     * @param {number} [maxWorkers] Maximum number of workers to run in one time.
     * @param {object} [ctx] The hash to mix with default context in node 'run' function.
     */
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

    /**
     * Run targets processing.
     *
     * @param {string[]|string} targets IDs (or ID) of jobs to process.
     */
    process: function(targets) {
        return this.workers.start(this.arch.createPlan(targets));
    }

});
