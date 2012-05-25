var Q = require('q'),
    PATH = require('path'),
    APW = require('./apw'),

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
        .def('.apw.js')
        .val(function(file) {
            try {
                var p = require.resolve(PATH.resolve(file));
            } catch (ignore) {}

            if (p) return require(p);

            return {};
        })
        .end()
    .opt()
        .name('workers').title('Run number of workers')
        .short('w').long('workers')
        .def(DEFAULT_JOBS)
        .val(function(val) {
            return val > 0? val : DEFAULT_JOBS;
        })
        .end()
    .opt()
        .name('force').title('Force rebuild of all nodes')
        .long('force')
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
        return Q.when(opts.file.getArch? opts.file.getArch() : getEmptyArch(), function(arch) {
            return new APW(arch, opts.workers, {
                    method: opts.method,
                    verbose: opts.verbose,
                    force: opts.force
                })
                .process(args.targets);
        });
    });

function getEmptyArch() {
    var arch = new APW.Arch();
    arch.setNode({
        getId: function() {
            return 'all';
        },
        run: function() {
            console.error("** Nothing to be done for '%s'", this.getId());
        }
    });
    return arch;
}
