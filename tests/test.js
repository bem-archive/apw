var chunks = require('../lib/parts/chunks.js').newChunks(),
    newNode = require('../lib/parts/node.js').newNode;

var a1 = newNode('A1 (root node)', function() { console.log('run(A1)'); return 10 }),
    a2 = a1.addChild(newNode('A2', function() { console.log('run(A2)'); return 20 })),
    b1 = a2.addChild(newNode('B1', function() { console.log('run(B1)'); return 30 })),
    b2 = b1.addChild(newNode('B2', function() { console.log('run(B2)'); return 40 })),
    c1 = a2.addChild(newNode('C1', function() { console.log('run(C1)'); return 50 })),
    c2 = c1.addChild(newNode('C2', function() { console.log('run(C2)'); return 60 })),
    d = newNode('D', function() { console.log('run(D)'); return 70 }),
    e1 = d.addChild(newNode('E1', function() { console.log('run(E1)'); return 80 })),
    e2 = e1.addChild(newNode('E2', function() { console.log('run(E2)'); return 90 })),
    f1 = d.addChild(newNode('F1', function() { console.log('run(F1)'); return 100 })),
    f2 = f1.addChild(newNode('F2', function() { console.log('run(F2)'); return 110 }));

d.addParent(b2);
d.addParent(c2);

chunks.fillChunks(a1);
console.log('=========\nINITIAL CHUNKS\n---------');
console.log(chunks.toString());
console.log('=========\nRUN JOBS\n---------');
chunks.run();