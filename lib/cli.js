var Q = require('qq'),
    PATH = require('path'),
    PROTO = require('./samurai'),

    DEFAULT_JOBS = 4;

module.exports = require('coa').Cmd()
    .name(PATH.basename(process.argv[1]))
    .title('Build core prototype')
    .helpful()
    .opt()
        .name('version').title('Show version')
        .short('v').long('version')
        .flag()
        .only()
        .act(function() {
            return JSON.parse(require('fs').readFileSync(
                PATH.join(__dirname, '..', 'package.json')))
                    .version;
        })
        .end()
    .opt()
        .name('file').title('Build file')
        .short('f').long('file')
        .def('.samurai.js')
        .val(function(file) {
            try {
                var p = require.resolve(PATH.resolve(file));
            } catch (ignore) {}

            if (p) return require(p);

            return {};
        })
        .end()
    .opt()
        .name('method').title('Method to run, default: make')
        .short('m').long('method')
        .def('make')
        .end()
    .opt()
        .name('jobs').title('Run concurrent number of jobs')
        .short('j').long('jobs')
        .def(DEFAULT_JOBS)
        .val(function(val) {
            return val > 0? val : DEFAULT_JOBS;
        })
        .end()
    .opt()
        .name('force').title('Force rebuild of all nodes')
        .short('f').long('force')
        .flag()
        .end()
    .opt()
        .name('verbose').title('Verbose mode')
        .long('verbose')
        .flag()
        .end()
    .arg()
        .name('targets').title('Build targets')
        .def('all')
        .arr()
        .end()
    .completable()
    .act(function(opts, args) {
        return Q.invoke(opts.file.getGraph? opts.file.getGraph() : getEmptyGraph(),
            'process', args.targets, opts.jobs,
            { method: opts.method, verbose: opts.verbose, force: opts.force });
    });

function getEmptyGraph() {
    var graph = new PROTO.Graph();
    graph.setNode({
        getId: function() {
            return 'all';
        },
        run: function() {
            console.error("** Nothing to be done for '%s'", this.getId());
        }
    });
    return graph;
}
