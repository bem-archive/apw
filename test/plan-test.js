var APW = require('..'),
    ASSERT = require('assert'),
    COMMON = require('./common'),

    getSimpleArch = COMMON.getSimpleArch,
    getEmptyArch = COMMON.getEmptyArch,
    createNode = COMMON.createNode,

    arch,
    plan,
    job;

function getPlan() {
    return getSimpleArch().createPlan('A');
}

describe('Jobs', function() {
    beforeEach(function() {
        job = getPlan().nextJob();
    });

    it('nextJob()', function() {
        ASSERT.equal(job.id, 'C');
    });
});

describe('Operability', function() {
    beforeEach(function() {
        plan = getPlan();
    });

    it('isOperable() default', function() {
        ASSERT.equal(plan.isOperable(), true);
    });

    it('allDone() default', function() {
        ASSERT.equal(plan.allDone(), false);
    });
});

describe('Node removal', function() {
    beforeEach(function() {
        plan = getPlan();
    });

    it('removeNode() leaf B', function() {
        ASSERT.equal(plan.hasNode('B'), true);

        plan.removeNode('B');

        ASSERT.equal(plan.hasNode('B'), false);
    });

    it('removeNode() node A', function() {
        ASSERT.equal(plan.hasNode('A'), true);

        plan.removeNode('A');

        ASSERT.equal(plan.hasNode('A'), false);
    });
});

describe('Remove tree (simple plan)', function() {
    beforeEach(function() {
        arch = getEmptyArch()
            .addNode(createNode('A'))
            .addNode(createNode('B'), 'A')
            .addNode(createNode('C'), 'A')
            .addNode(createNode('D'), ['B', 'C']);

        plan = arch.createPlan('A');
    });

    it('removeTree() C unforced', function() {
        arch.removeTree('C');

        ASSERT.equal(plan.hasChildren('A', 'B'), true);
        ASSERT.equal(plan.hasChildren('A', 'C'), false);
        ASSERT.equal(plan.hasChildren('B', 'D'), true);
        ASSERT.equal(plan.hasNode('C'), false);
    });

    it('removeTree() C forced', function() {
        arch.removeTree('C', true);

        ASSERT.equal(plan.hasChildren('A', 'B'), true);
        ASSERT.equal(plan.hasChildren('A', 'C'), false);
        ASSERT.equal(plan.hasChildren('B', 'D'), false);
        ASSERT.equal(plan.hasNode('C'), false);
        ASSERT.equal(plan.hasNode('D'), false);
    });
});

describe('Lock', function() {
    beforeEach(function() {
        plan = getSimpleArch().createPlan('A');

        plan.lock();
        plan.lock();
    });

    it('lock() / unlock()', function() {
        ASSERT.equal(plan.locked, 2);
        plan.unlock();
        ASSERT.equal(plan.locked, 1);
        plan.unlock();
        ASSERT.equal(plan.locked, 0);
        plan.unlock();
        ASSERT.equal(plan.locked, 0);
    });
});
