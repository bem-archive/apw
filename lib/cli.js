var PATH = require('path'),
    newJobs = require('./parts/jobs').newJobs,
    newGraph = require('./parts/graph').newGraph,

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
        .def('.make.js')
        .val(function(file) {
            try {
                var p = require.resolve(PATH.resolve(file));
            } catch (ignore) {}

            if (p) return require(p);

            return {};
        })
        .end()
    .opt()
        .name('jobs').title('Run of jobs')
        .short('j').long('jobs')
        .def(DEFAULT_JOBS)
        .val(function(val) {
            return val > 0? val : DEFAULT_JOBS;
        })
        .end()
    .arg()
        .name('targets').title('Build targets')
        .arr()
        .req()
        .end()
    .completable()
    .act(function(opts, args) {
        var graph = opts.file.getGraph? opts.file.getGraph() : newGraph(),
            plan = graph.createPlan.apply(graph, args.targets);
        return newJobs(plan, opts.jobs).start();
    });
