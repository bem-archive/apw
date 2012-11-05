var APW = require('..'),
    ASSERT = require('assert'),
    COMMON = require('./common'),

    getSimpleArch = COMMON.getSimpleArch,
    getEmptyArch = COMMON.getEmptyArch,
    createNode = COMMON.createNode;

/**
 * Mocha BDD interface.
 */
/** @name describe @function */
/** @name it @function */
/** @name before @function */
/** @name after @function */
/** @name beforeEach @function */
/** @name afterEach @function */

function getArch1() {
    /*
        A
       / \
      B   C
       \ /
        D
    */
    return getEmptyArch()
        .addNode(createNode('A'))
        .addNode(createNode('B'), 'A')
        .addNode(createNode('C'), 'A')
        .addNode(createNode('D'), ['B', 'C']);
}

function getArch2() {
    /*
        A
       / \
      B   D
      |   |
      C   E
       \ /
        F
        |
        G
     */
    return getEmptyArch()
        .addNode(createNode('A'))
        .addNode(createNode('B'), 'A')
        .addNode(createNode('D'), 'A')
        .addNode(createNode('C'), 'B')
        .addNode(createNode('E'), 'D')
        .addNode(createNode('F'), ['C', 'E'])
        .addNode(createNode('G'), 'F');
}

describe('Arch getters', function() {

    var arch;

    beforeEach(function() {
        arch = getSimpleArch();
    });

    it('getNode() A', function() {
        ASSERT.equal(arch.getNode('A').run(), 'testA');
    });

    it('getNode() default', function() {
        ASSERT.equal(arch.getNode('XXX').getId(), 'XXX');
    });

    it('getChildren() A', function() {
        var children = arch.getChildren('A');

        ASSERT.equal(children.length, 1);
        ASSERT.equal(children.pop(), 'B');
     });

    it('getParents() B', function() {
        var parents = arch.getParents('B');

        ASSERT.equal(parents.length, 1);
        ASSERT.equal(parents.pop(), 'A');
    });

});

describe('Arch.addNode()', function() {

    var arch;

    beforeEach(function() {
        arch = getSimpleArch();
    });

    it('new', function() {
        arch.addNode(createNode('new'), 'A', 'B');

        ASSERT.ok(arch.hasNode('new'));
        ASSERT.equal(arch.getChildren('new'), 'B');
        ASSERT.equal(arch.getParents('new'), 'A');
    });

});

describe('Arch.setNode()', function() {

    var arch;

    beforeEach(function() {
        arch = getArch1();
    });

    it('new', function() {
        arch.setNode(createNode('new'), 'A', 'D');

        ASSERT.ok(arch.hasNode('new'));
        ASSERT.equal(arch.getParents('new'), 'A');
        ASSERT.equal(arch.getChildren('new'), 'D');
    });

    it('already existent', function() {
        var replaceNode = 'D';
        arch.setNode({
            getId: function() {
                return replaceNode;
            },
            run: function() {
                return 'new ' + replaceNode;
            }
        }, 'A', 'B');

        ASSERT.ok(arch.hasNode(replaceNode));
        ASSERT.equal(arch.getNode(replaceNode).run(), 'new ' + replaceNode);
        ASSERT.equal(arch.getParents(replaceNode), 'A');
        ASSERT.equal(arch.getChildren(replaceNode), 'B');
    });

});

describe('Arch.replaceNode()', function() {

    var arch;

    beforeEach(function() {
        arch = getArch1();
    });

    it('already existent', function() {
        var replaceNode = 'D';
        arch.replaceNode({
            getId: function() {
                return replaceNode;
            },
            run: function() {
                return 'new ' + replaceNode;
            }
        }, 'A', 'B');

        ASSERT.ok(arch.hasNode(replaceNode));
        ASSERT.equal(arch.getNode(replaceNode).run(), 'new ' + replaceNode);
        ASSERT.equal(arch.getParents(replaceNode), 'A');
        ASSERT.equal(arch.getChildren(replaceNode), 'B');
    });

});

describe('Node availability check', function() {

    var arch;

    beforeEach(function() {
        arch = getEmptyArch()
            .addNode(createNode('A1'))
            .addNode(createNode('A2'))
            .addNode(createNode('B'), 'A1')
            .addNode(createNode('C'), ['A1', 'A2']);
    });

    it('hasNode() A1', function() {
        ASSERT.equal(arch.hasNode('A1'), true);
    });

    it('hasNode() absent', function() {
        ASSERT.equal(arch.hasNode('XXX'), false);
    });

    it('hasParents() B', function() {
        ASSERT.equal(arch.hasParents('B', 'A1'), true);
    });

    it('hasParents() C[A1, A2]', function() {
        ASSERT.equal(arch.hasParents('C', ['A1', 'A2']), true);
    });

    it('hasParents() absent', function() {
        ASSERT.equal(arch.hasParents('B', 'XXX'), false);
    });

    it('hasParents() C[A1, A2, absent]', function() {
        ASSERT.equal(arch.hasParents('C', ['A1', 'A2', 'XXX']), false);
    });

    it('hasChildren() A1', function() {
        ASSERT.equal(arch.hasChildren('A1', 'B'), true);
    });

    it('hasChildren() A1[B, C]', function() {
        ASSERT.equal(arch.hasChildren('A1', ['B', 'C']), true);
    });

    it('hasChildren() A1[B, C, absent]', function() {
        ASSERT.equal(arch.hasChildren('A1', ['B', 'C', 'XXX']), false);
    });

    it('hasChildren() absent', function() {
        ASSERT.equal(arch.hasChildren('A1', 'XXX'), false);
    });

});

describe('Node removal', function() {

    var arch;

    beforeEach(function() {
        arch = getSimpleArch();
    });

    it('removeNode() leaf B', function() {
        ASSERT.equal(arch.hasNode('B'), true);

        arch.removeNode('B');

        ASSERT.equal(arch.hasNode('B'), false);
        ASSERT.equal(arch.getChildren('A').length, 0);
    });

    it('removeNode() node A', function() {
        ASSERT.equal(arch.hasNode('A'), true);
        ASSERT.equal(arch.getParents('B').length, 1);
        ASSERT.equal(arch.getParents('B')[0], 'A');

        arch.removeNode('A');

        ASSERT.equal(arch.hasNode('A'), false);
        ASSERT.equal(arch.getParents('B').length, 0);
    });

});

describe('Node link', function() {

    var arch;

    beforeEach(function() {
        arch = getEmptyArch()
            .addNode(createNode('A'))
            .addNode(createNode('B'))
            .link('B', 'A')
            .link('B', 'A');
    });

    it('link() B -> A', function() {
        var children = arch.getChildren('A'),
            parents = arch.getParents('B');

        ASSERT.equal(children.length, 1);
        ASSERT.equal(children[0], 'B');

        ASSERT.equal(parents.length, 1);
        ASSERT.equal(parents[0], 'A');
    });

});

describe('Node unlink', function() {

    var arch;

    beforeEach(function() {
        arch = getSimpleArch()
            .unlink('B', 'A')
            .unlink('B', 'A');
    });

    it('unlink() B - A', function() {
        ASSERT.equal(arch.getChildren('A').length, 0);
        ASSERT.equal(arch.getParents('B').length, 0);
    });

});

describe('Remove tree (simple arch)', function() {

    var arch;

    beforeEach(function() {
        arch = getArch1();
    });

    it('Remove tree (simple arch) unforced', function() {
        arch.removeTree('C');

        ASSERT.equal(arch.hasChildren('A', 'B'), true);
        ASSERT.equal(arch.hasChildren('A', 'C'), false);
        ASSERT.equal(arch.hasChildren('B', 'D'), true);
        ASSERT.equal(arch.hasNode('C'), false);
    });

    it('Remove tree (simple arch) forced', function() {
        arch.removeTree('C', true);

        ASSERT.equal(arch.hasChildren('A', 'B'), true);
        ASSERT.equal(arch.hasChildren('A', 'C'), false);
        ASSERT.equal(arch.hasChildren('B', 'D'), false);
        ASSERT.equal(arch.hasNode('C'), false);
        ASSERT.equal(arch.hasNode('D'), false);
    });

});

describe('Remove tree (not so simple arch)', function() {

    var arch;

    beforeEach(function() {
        arch = getArch2();
    });

    it('Remove tree (not so simple arch) unforced', function() {
        arch.removeTree('D');

        ASSERT.equal(arch.hasChildren('A', 'B'), true);
        ASSERT.equal(arch.hasChildren('B', 'C'), true);
        ASSERT.equal(arch.hasChildren('C', 'F'), true);
        ASSERT.equal(arch.hasChildren('F', 'G'), true);
        ASSERT.equal(arch.hasNode('D'), false);
        ASSERT.equal(arch.hasNode('E'), false);
    });

    it('Remove tree (not so simple arch) forced', function() {
        arch.removeTree('D', true);

        ASSERT.equal(arch.hasChildren('A', 'B'), true);
        ASSERT.equal(arch.hasChildren('B', 'C'), true);
        ASSERT.equal(arch.hasChildren('C', 'F'), false);
        ASSERT.equal(arch.hasNode('D'), false);
        ASSERT.equal(arch.hasNode('E'), false);
        ASSERT.equal(arch.hasNode('F'), false);
        ASSERT.equal(arch.hasNode('G'), false);
    });

});

describe('Remove tree (simple arch + plan) unforced', function() {

    var plan;

    beforeEach(function() {
        var arch = getArch1();
        plan = arch.createPlan('A');

        arch.removeTree('C');
    });

    it('removeTree() C unforced', function() {
        ASSERT.equal(plan.hasChildren('A', 'B'), true);
        ASSERT.equal(plan.hasChildren('A', 'C'), false);
        ASSERT.equal(plan.hasChildren('B', 'D'), true);
        ASSERT.equal(plan.hasNode('C'), false);
    });

});

describe('Remove tree (rhombus arch)', function() {

    var arch;

    beforeEach(function() {
        arch = getEmptyArch()
            .addNode(createNode('A'))
            .addNode(createNode('B'), 'A')
            .addNode(createNode('C'), 'A')
            .addNode(createNode('D'), ['B', 'C']);
    });

    it('removeTree() A unforced', function() {
        arch.removeTree('A');

        ASSERT.equal(arch.hasNode('A'), false);
        ASSERT.equal(arch.hasNode('B'), false);
        ASSERT.equal(arch.hasNode('C'), false);
        ASSERT.equal(arch.hasNode('D'), false);
    });

});

describe('Lock', function() {

    var arch;

    beforeEach(function() {
        arch = getEmptyArch();

        arch.lock();
        arch.lock();
    });

    it('lock() / unlock()', function() {
        ASSERT.equal(arch.locked, 2);
        arch.unlock();
        ASSERT.equal(arch.locked, 1);
        arch.unlock();
        ASSERT.equal(arch.locked, 0);
        arch.unlock();
        ASSERT.equal(arch.locked, 0);
    });

});
