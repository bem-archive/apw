var ASSERT = require('assert'),
    COMMON = require('./common'),

    getSimpleArch = COMMON.getSimpleArch,
    createNode = COMMON.createNode,

    arch;

describe('Arch asserts:', function() {
    beforeEach(function() {
        arch = getSimpleArch();
    });

    it('throw addNode() / absentId', function() {
        ASSERT.throws(function() { arch.addNode(createNode('A')) });
    });

    it('throw replaceNode() / hasId', function() {
        ASSERT.throws(function() { arch.replaceNode(createNode('X')) });
    });

    it('throw hasParents() / idTypeIsOk', function() {
        ASSERT.throws(function() { arch.hasParents(new Date(), ['X']) });
    });

    it('throw hasParents() / hasId', function() {
        ASSERT.throws(function() { arch.hasParents('X', ['Y']) });
    });

    it('throw hasChildren() / idTypeIsOk', function() {
        ASSERT.throws(function() { arch.hasChildren(new Date(), ['X']) });
    });

    it('throw hasChildren() / hasId', function() {
        ASSERT.throws(function() { arch.hasChildren('X', ['Y']) });
    });

    it('throw getChildren() / idTypeIsOk', function() {
        ASSERT.throws(function() { arch.getChildren(new Date()) });
    });

    it('throw getChildren() / hasId', function() {
        ASSERT.throws(function() { arch.getChildren('X') });
    });

    it('throw getParents() / idTypeIsOk', function() {
        ASSERT.throws(function() { arch.getParents(new Date()) });
    });

    it('throw getParents() / hasId', function() {
        ASSERT.throws(function() { arch.getParents('X') });
    });

    it('throw link() / hasIds(children)', function() {
        ASSERT.throws(function() { arch.link('A', 'X') });
    });

    it('throw link() / hasIds(parents)', function() {
        ASSERT.throws(function() { arch.link('X', 'A') });
    });

    it('throw unlink() / idTypeIsOk(id1)', function() {
        ASSERT.throws(function() { arch.unlink(new Date(), 'A') });
    });

    it('throw unlink() / idTypeIsOk(id2)', function() {
        ASSERT.throws(function() { arch.unlink('A', new Date()) });
    });

    it('throw unlink() / hasId(id1)', function() {
        ASSERT.throws(function() { arch.unlink('X', 'B') });
    });

    it('throw unlink() / hasId(id2)', function() {
        ASSERT.throws(function() { arch.unlink('A', 'X') });
    });

    it('throw removeTree() / idTypeIsOk', function() {
        ASSERT.throws(function() { arch.removeTree(new Date()) });
    });

    it('throw removeTree() / hasId', function() {
        ASSERT.throws(function() { arch.unlink('X') });
    });

    it('throw createPlan() / hasIds', function() {
        ASSERT.throws(function() { arch.createPlan('X') });
    });

});