var INHERIT = require('inherit');

module.exports = INHERIT(/** @lends APW.prototype */ {

    /**
     * Creates an instance of APW.
     *
     * @class APW
     * @constructs
     * @param {Arch} arch The Arch to work with.
     * @param {Number} [maxWorkers] Maximum number of workers to run simultaneously.
     * @param {Object} [ctx] The hash to mix with default context in node 'run' function.
     */
    __constructor: function(arch, maxWorkers, ctx) {
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
     * @param {String[]|String} targets IDs (or ID) of jobs to process.
     * @returns {Promise * Undefined} Promise of this process to complete.
     */
    process: function(targets) {
        return this.workers.start(this.arch.createPlan(targets));
    }

}, /** @lends APW */ {

    /** @type COA.api */
    api: require('./coa').api,

    /** @type Arch */
    Arch: require('./arch'),

    /** @type Plan */
    Plan: require('./plan'),

    /** @type Workers */
    Workers: require('./workers')

});
