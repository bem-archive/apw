var chunkIDSequence = 1;

function Chunk() {
    this.id = chunkIDSequence++;
    this.waiting = {};
    this.waitingNum = 0;
    this.jobs = [];
    this.idle = true;
}

exports.newChunk = function(job) {
    var chunk = new Chunk();
    if (job) chunk.pushJob(job);
    return chunk;
};

Chunk.prototype.pushJob = function(job) {
    this.jobs.push(job);
};

Chunk.prototype.nextJob = function() {
    return this.jobs.pop();
};

Chunk.prototype.hasMoreJobs = function() {
    return this.jobs.length !== 0;
};

Chunk.prototype.addWaiting = function(id) {
    var C = this;
    if (!C.waiting[id]) {
        C.waiting[id] = true;
        C.waitingNum++;
    }
};

Chunk.prototype.removeWaiting = function(id) {
    var C = this;
    if (C.waiting[id]) {
        delete C.waiting[id];
        C.waitingNum--;
    }
};

Chunk.prototype.locked = function() {
    return this.waitingNum !== 0;
};

Chunk.prototype.toString = function() {
    var C = this,
        s = '  Chunk[' + C.id + ']\n';
    s += '    Idle: ' + C.idle + '\n';
    for (var i = 0; i < C.jobs.length; i++) {
        s += '  ' + C.jobs[i].toString() + '\n';
    }
    if (C.locked()) {
        s += '    Locked by:';
        for (i in this.waiting) {
            s += ' ' + i + ',';
        }
        s = s.substring(0, s.length - 1) + '\n';
    }
    return s;
};