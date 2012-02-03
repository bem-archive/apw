function Jobs(maxWorkers) {
    var J = this;

    J.maxWorkers = maxWorkers;
    J.activeWorkers = 0;

    J.jobsStore = {};
    J.jobsQueue = [];
}

exports.newJobs = function(maxWorkers) {
    return new Jobs(maxWorkers || 4);
};

Jobs.prototype.pushJob = function(job, cbFinished) {
    var J = this;

    J.jobsStore[job.id] = { run: job.run, cbFinished: cbFinished };
    J.jobsQueue.push(job.id);
    J.runNext();
};

Jobs.prototype.runNext = function() {
    var J = this;

    if (J.jobsQueue.length && J.activeWorkers < J.maxWorkers) {
        var jobID = J.jobsQueue.shift(),
        job = J.jobsStore[jobID];

        delete J.jobsStore[jobID];

        J.activeWorkers++;

        J.work(job);
    }
};

Jobs.prototype.finished = function(result, cbFinished) {
    var J = this;

    J.activeWorkers--;

    process.nextTick(function() { cbFinished(result) });

    J.runNext();
};

Jobs.prototype.work = function(job) {
    var J = this;
    process.nextTick(
        function() {
            job.run(function(result) {
                J.finished(result, job.cbFinished)
            })
        }
    );
};

Jobs.prototype.toString = function() {
    var J = this,
        s = '';

    for (var i = 0; i < J.jobsQueue.length; i++) {
        s += ' ' + J.jobsQueue[i];
    }

    s += '\n';

    return s;
};
