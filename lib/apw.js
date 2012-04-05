var INHERIT = require('inherit');

module.exports = INHERIT({

    /**
     * Creates an instance of APW.
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

        this.workers = new this.__self.Workers(maxWorkers, ctx);
    },

    /**
     * Run targets processing.
     *
     * @param {string[]|string} targets IDs (or ID) of jobs to process.
     * @returns {promise} Promise of this process.
     */
    process: function(targets) {
        return this.workers.start(this.arch.createPlan(targets));
    }

}, {

    api: require('./coa').api,
    Arch: require('./arch'),
    Plan: require('./plan'),
    Workers: require('./workers')

});
