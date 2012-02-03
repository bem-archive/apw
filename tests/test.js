var chunks = require('../lib/parts/chunks.js').newChunks(),
    newNode = require('../lib/parts/node.js').newNode;

var a1 = newNode('A1 (root node)', function() { console.log('run(A1)') }),
    a2 = a1.addChild(newNode('A2', function() { console.log('run(A2)') })),
    b1 = a2.addChild(newNode('B1', function() { console.log('run(B1)') })),
    b2 = b1.addChild(newNode('B2', function() { console.log('run(B2)') })),
    c1 = a2.addChild(newNode('C1', function() { console.log('run(C1)') })),
    c2 = c1.addChild(newNode('C2', function() { console.log('run(C2)') })),
    d = newNode('D', function() { console.log('run(D)') }),
    e1 = d.addChild(newNode('E1', function() { console.log('run(E1)') })),
    e2 = e1.addChild(newNode('E2', function() { console.log('run(E2)') })),
    f1 = d.addChild(newNode('F1', function() { console.log('run(F1)') })),
    f2 = f1.addChild(newNode('F2', function() { console.log('run(F2)') }));

d.addParent(b2);
d.addParent(c2);

chunks.extractChunks(a1);
console.log('=========\nINITIAL CHUNKS\n---------');
console.log(chunks.toString());
console.log('=========\nRUN JOBS\n---------');
chunks.pushJobs();