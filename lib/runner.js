var INHERIT = require('inherit'),
    Workers = require('./workers');

module.exports = INHERIT({

    __constructor: function(arch, maxWorkers, ctx) {
        this.arch = arch;
        this.workers = new Workers(maxWorkers, ctx);
    },

    process: function(targets) {
        return this.workers.start(this.arch.createPlan(targets));
    }

});
