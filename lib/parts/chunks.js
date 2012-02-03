var newChunk = require('./chunk.js').newChunk,
    newJobs = require('./jobs.js').newJobs;

function Chunks() {
    this.chunks = {};
    this.jobs = newJobs();
}

exports.newChunks = function() {
    return new Chunks();
};

Chunks.prototype.fillChunks = function(node) {
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
            // create chunk from scratch
            chunk = C.createChunk(node);
            chunked[node.id] = chunk.id;
            C.chunks[chunk.id] = chunk;

            C.fillChunk(chunked, node, chunk);
        }
    } else if (nc.length !== 0) {
        if (nc.length === 1) { // simple chain with only one child, just append it
            child = nc[0];

            if (!chunked[child.id]) {
                if (child.parents.length < 2) {
                    chunk.pushJob(child);
                    chunked[child.id] = chunk.id;

                    C.fillChunk(chunked, child, chunk);
                } else {
                    subChunk = C.createChunk(child);
                    chunked[child.id] = subChunk.id;
                    C.chunks[subChunk.id] = subChunk;
                    chunk.addLocking(subChunk.id);

                    C.fillChunk(chunked, child, subChunk);
                }
            } else {
                chunk.addLocking(chunked[child.id]);
            }
        } else { // node with several dependencies
            for (var i = 0; i < nc.length; i++) { // create one chunk per node
                child = nc[i];

                if (!chunked[child.id]) {
                    subChunk = C.createChunk(child);
                    chunked[child.id] = chunk.id;
                    C.chunks[subChunk.id] = subChunk;
                    chunk.addLocking(subChunk.id);

                    C.fillChunk(chunked, child, subChunk);
                } else {
                    chunk.addLocking(chunked[child.id]);
                }
            }
        }
    }
};

Chunks.prototype.run = function() {
    this.pushJobs();
};

Chunks.prototype.pushJobs = function() {
    var C = this,
        chunk;

    for (var i in C.chunks) {
        chunk = C.chunks[i];
        if (!chunk.locked() && chunk.idle && chunk.hasMoreJobs()) {
            chunk.idle = false;
            C.jobs.pushJob(chunk.nextJob(), C.finished(chunk.id));
        }
    }
};

Chunks.prototype.finished = function(chunkID) {
    var C = this;
    return function(result) {
        console.log('Finished job from chunk #' + chunkID + ' with result = ' + result);
        C.purge(chunkID);
        C.chunks[chunkID].idle = true;
        C.pushJobs();
    };
};

Chunks.prototype.purge = function(chunkID) {
    var C = this,
        chunk,
        canRemove = !C.chunks[chunkID].hasMoreJobs();

    for (var i in C.chunks) {
        chunk = C.chunks[i];
        if (canRemove) chunk.removeLocking(chunkID);
        if (chunk.idle && !chunk.hasMoreJobs()) {
            delete C.chunks[i];
        }
    }
};

Chunks.prototype.toString = function() {
    var s = 'Chunks:\n';
    for (var i in this.chunks) {
        s += this.chunks[i].toString();
    }
    return s;
};