var cp = require('child_process');

function Jobs(maxWorkers) {
    var J = this;

    J.maxWorkers = maxWorkers;
    J.workers = [];
    J.activeWorkers = 0;

    J.jobsStore = {};
    J.jobsQueue = [];

    J.jobIDSequence = 0;
}

exports.newJobs = function(maxWorkers) {
    return new Jobs(maxWorkers === undefined ? 4 : maxWorkers);
};

Jobs.prototype.pushJob = function(job, cbFinished) {
    var J = this;

    J.jobsStore[this.jobIDSequence] = { run: job.run, cbFinished: cbFinished };
    J.jobsQueue.push(J.jobIDSequence);
    J.jobIDSequence++;
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
    process.nextTick(function() { J.finished(job.run(), job.cbFinished) });
};