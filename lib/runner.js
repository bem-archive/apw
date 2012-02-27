var INHERIT = require('inherit'),
    Pool = require('./pool');

module.exports = INHERIT({

    __constructor: function(graph, maxWorkers, ctx) {
        this.graph = graph;
        this.pool = new Pool(maxWorkers, ctx);
    },

    process: function(targets) {
        return this.pool.start(this.graph.createPlan(targets));
    }

}, {

    create: function(graph, maxWorkers, ctx) {
        return new this(graph, maxWorkers, ctx);
    }

});
