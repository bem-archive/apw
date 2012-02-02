var newChunk = require('./chunk.js').newChunk;

function Chunks() {
    this.chunks = {};
}

exports.newChunks = function() {
    return new Chunks();
};

Chunks.prototype.extractChunks = function(node) {
    this.fillChunk({}, node);
    console.log(this.toString());
};

Chunks.prototype.createChunk = function(job) {
    return newChunk(job);
};

Chunks.prototype.fillChunk = function(chunked, node, chunk) {
    var C = this,
        nc = node.children;

    if (!chunk) {
        if (!chunked[node.id]) {
            chunk = C.createChunk(node);
            C.chunks[chunk.id] = chunk;
            chunked[node.id] = true;
            C.fillChunk(chunked, node, chunk);
        }
    } else if (nc.length !== 0) {
        if (nc.length === 1) {
            if (nc[0].parents.length < 2) {
                chunk.pushJob(nc[0]);
                chunked[nc[0].id] = true;
                C.fillChunk(chunked, nc[0], chunk);
            } else {
                if (!chunked[nc[0].id]) {
                    var subChunk = C.createChunk(nc[0]);
                    C.chunks[subChunk.id] = subChunk;
                    chunked[nc[0].id] = true;
                    chunk.addWaiting(subChunk.id);
                    C.fillChunk(chunked, nc[0], subChunk);
                }
            }
        } else {
            for (var i = 0; i < nc.length; i++) {
                var child = nc[i];
                if (!chunked[child.id]) {
                    var subChunk = C.createChunk(child);

                    C.chunks[subChunk.id] = subChunk;
                    chunked[child.id] = true;
                    chunk.addWaiting(subChunk.id);
                    C.fillChunk(chunked, child, subChunk);
                }
            }
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