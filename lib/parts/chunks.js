var newChunk = require('./chunk.js').newChunk,
    newJobs = require('./jobs.js').newJobs;

function Chunks() {
    this.chunks = {};
    this.jobs = newJobs();
}

exports.newChunks = function() {
    return new Chunks();
};

Chunks.prototype.extractChunks = function(node) {
    this.fillChunk({}, node);
};

Chunks.prototype.createChunk = function(job) {
    return newChunk(job);
};

Chunks.prototype.fillChunk = function(chunked, node, chunk) {
    var C = this,
        nc = node.children,
        subChunk, child;

    if (!chunk) {
        if (!chunked[node.id]) {
            chunk = C.createChunk(node);
            C.chunks[chunk.id] = chunk;
            chunked[node.id] = chunk.id;
            C.fillChunk(chunked, node, chunk);
        }
    } else if (nc.length !== 0) {
        if (nc.length === 1) {
            child = nc[0];

            if (!chunked[child.id]) {
                chunked[child.id] = chunk.id;

                if (child.parents.length < 2) {
                    chunk.pushJob(child);
                    C.fillChunk(chunked, child, chunk);
                } else {
                    subChunk = C.createChunk(child);
                    C.chunks[subChunk.id] = subChunk;
                    chunk.addWaiting(subChunk.id);
                    C.fillChunk(chunked, child, subChunk);
                }
            } else {
                chunk.addWaiting(chunked[child.id]);
            }
        } else {
            for (var i = 0; i < nc.length; i++) {
                child = nc[i];

                if (!chunked[child.id]) {
                    subChunk = C.createChunk(child);

                    C.chunks[subChunk.id] = subChunk;
                    chunked[child.id] = chunk.id;
                    chunk.addWaiting(subChunk.id);
                    C.fillChunk(chunked, child, subChunk);
                } else {
                    chunk.addWaiting(chunked[child.id]);
                }
            }
        }
    }
};

Chunks.prototype.pushJobs = function() {
    var C = this,
        chunk;

    for (var i in C.chunks) {
        chunk = C.chunks[i];
        if (!chunk.locked() && chunk.idle) {
            job = chunk.nextJob();
            chunk.idle = false;
            C.jobs.pushJob(job, C.finished(chunk.id));
        }
    }
};

Chunks.prototype.finished = function(chunkID) {
    var C = this;
    return function(result) {
        C.chunks[chunkID].idle = true;
        C.purge(chunkID);
        process.nextTick(C.pushJobs());
    };
};

Chunks.prototype.purge = function(chunkID) {
    var C = this,
        chunk;
    for (var i in C.chunks) {
        chunk = C.chunks[i];
        if (chunk.idle && !chunk.hasMoreJobs()) {
            delete C.chunks[i];
        } else {
            chunk.removeWaiting(chunkID);
        }
    }
};

Chunks.prototype.toString = function() {
    var s = 'Chunks:\n';
    for (var i in this.chunks) {
        s += this.chunks[i].toString();
    }
    s += 'Jobs from chunks:\n';
    s += this.jobs.toString();
    return s;
};