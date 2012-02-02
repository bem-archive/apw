var chunks = require('../lib/parts/chunks.js').newChunks(),
    newNode = require('../lib/parts/node.js').newNode;

var a1 = newNode('A1 (root node)'),
    a2 = a1.addChild(newNode('A2')),
    b1 = a2.addChild(newNode('B1')),
    b2 = b1.addChild(newNode('B2')),
    c1 = a2.addChild(newNode('C1')),
    c2 = c1.addChild(newNode('C2')),
    d = newNode('D'),
    e1 = d.addChild(newNode('E1')),
    e2 = e1.addChild(newNode('E2')),
    f1 = d.addChild(newNode('F1')),
    f2 = f1.addChild(newNode('F2'));

d.addParent(b2);
d.addParent(c2);

chunks.extractChunks(a1);
console.log('CHUNKS BEFORE PUSH JOBS');
console.log(chunks.toString());
chunks.pushJobs();
console.log('CHUNKS AFTER PUSH JOBS');
console.log(chunks.toString());