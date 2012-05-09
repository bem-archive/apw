var VOWS = require('vows'),
	assert = require('assert'),
    suite = VOWS.describe('Arch'),
    APW = require('../lib/apw');

function createNode(id) {
    return {

        getId: function() {
            return id;
        },

        run: function() {
            return 'test' + id;
        }

    };
}

function getEmptyArch() {
    return new APW.Arch();
}

function getSimpleArch() {
    return getEmptyArch()
        .addNode(createNode('A'))
        .addNode(createNode('B'), 'A');
}

function getArch1() {
    return getEmptyArch()
        .addNode(createNode('A'))
        .addNode(createNode('B'), 'A')
        .addNode(createNode('C'), 'A')
        .addNode(createNode('D'), ['B', 'C']);
}

function getArch2() {
    return getEmptyArch()
        .addNode(createNode('A'))
        .addNode(createNode('B'), 'A')
        .addNode(createNode('D'), 'A')
        .addNode(createNode('C'), 'B')
        .addNode(createNode('E'), 'D')
        .addNode(createNode('F'), ['C', 'E'])
        .addNode(createNode('G'), 'F');
}

suite
    .addBatch({

        'Arch getters': {
            topic: getSimpleArch,
            'getNode() A': function(arch) {
                assert.equal(arch.getNode('A').run(), 'testA');
            },
            'getNode() default': function(arch) {
                assert.equal(arch.getNode('XXX').getId(), 'XXX');
            },
            'getChildren() A': function(arch) {
                var children = arch.getChildren('A');

                assert.lengthOf(children, 1);
                assert.equal(children.pop(), 'B');
            },
            'getParents() B': function(arch) {
                var parents = arch.getParents('B');

                assert.lengthOf(parents, 1);
                assert.equal(parents.pop(), 'A');
            }
        },

        'Arch.addNode()': {
            topic: getSimpleArch,
            'new': function(arch) {
                arch.addNode(createNode('new'));

                assert.ok(arch.hasNode('new'));
            },
            'already existent throws': function(arch) {
                assert.throws(function() {
                    arch.addNode(createNode('A'));
                });
            }
        },

        'Arch.setNode()': {
            topic: getSimpleArch,
            'new': function(arch) {
                arch.setNode(createNode('new'));

                assert.ok(arch.hasNode('new'));
            },
            'already existent': function(arch) {
                arch.setNode({
                    getId: function() {
                        return 'A';
                    },
                    run: function() {
                        return 'new A';
                    }
                });

                assert.ok(arch.hasNode('A'));
                assert.equal(arch.getNode('A').run(), 'new A');
            }
        },

        'Arch.replaceNode()': {
            topic: getSimpleArch,
            'new throws': function(arch) {
                assert.throws(function() {
                    arch.replaceNode(createNode('new'));
                });
            },
            'already existent': function(arch) {
                arch.replaceNode({
                    getId: function() {
                        return 'A';
                    },
                    run: function() {
                        return 'new A';
                    }
                });

                assert.ok(arch.hasNode('A'));
                assert.equal(arch.getNode('A').run(), 'new A');
            }
        },

        'Node availability check': {
            topic: function() {
                return getEmptyArch()
                    .addNode(createNode('A1'))
                    .addNode(createNode('A2'))
                    .addNode(createNode('B'), 'A1')
                    .addNode(createNode('C'), ['A1', 'A2']);
            },
            'hasNode() A1': function(arch) {
                assert.equal(arch.hasNode('A1'), true);
            },
            'hasNode() absent': function(arch) {
                assert.equal(arch.hasNode('XXX'), false);
            },
            'hasParents() B': function(arch) {
                assert.equal(arch.hasParents('B', 'A1'), true);
            },
            'hasParents() C[A1, A2]': function(arch) {
                assert.equal(arch.hasParents('C', ['A1', 'A2']), true);
            },
            'hasParents() absent': function(arch) {
                assert.equal(arch.hasParents('B', 'XXX'), false);
            },
            'hasParents() C[A1, A2, absent]': function(arch) {
                assert.equal(arch.hasParents('C', ['A1', 'A2', 'XXX']), false);
            },
            'hasChildren() A1': function(arch) {
                assert.equal(arch.hasChildren('A1', 'B'), true);
            },
            'hasChildren() A1[B, C]': function(arch) {
                assert.equal(arch.hasChildren('A1', ['B', 'C']), true);
            },
            'hasChildren() A1[B, C, absent]': function(arch) {
                assert.equal(arch.hasChildren('A1', ['B', 'C', 'XXX']), false);
            },
            'hasChildren() absent': function(arch) {
                assert.equal(arch.hasChildren('A1', 'XXX'), false);
            }
        },

        'Node removal (leaf)': {
            topic: getSimpleArch,
            'removeNode() leaf B': function(arch) {
                assert.equal(arch.hasNode('B'), true);

                arch.removeNode('B');

                assert.equal(arch.hasNode('B'), false);
                assert.lengthOf(arch.getChildren('A'), 0);
            }
        },

        'Node removal (node)': {
            topic: getSimpleArch,
            'removeNode() node A': function(arch) {
                assert.equal(arch.hasNode('A'), true);
                assert.lengthOf(arch.getParents('B'), 1);
                assert.equal(arch.getParents('B')[0], 'A');

                arch.removeNode('A');

                assert.equal(arch.hasNode('A'), false);
                assert.lengthOf(arch.getParents('B'), 0);
            }
        },

        'Node removal (absent)': {
            topic: getSimpleArch,
            'removeNode() absent': function(arch) {
                assert.equal(arch.hasNode('XXX'), false);

                arch.removeNode('XXX');
            }
        },

        'Node link': {
            topic: function() {
                return getEmptyArch()
                    .addNode(createNode('A'))
                    .addNode(createNode('B'))
                    .link('B', 'A')
                    .link('B', 'A');
            },
            'link() B -> A': function(arch) {
                var children = arch.getChildren('A');
                
                assert.lengthOf(children, 1);
                assert.equal(children[0], 'B');

                var parents = arch.getParents('B');
                
                assert.lengthOf(parents, 1);
                assert.equal(parents[0], 'A');
            }
        },

        'Node unlink': {
            topic: function() {
                return getSimpleArch()
                    .unlink('B', 'A')
                    .unlink('B', 'A');
            },
            'unlink() B - A': function(arch) {
                assert.lengthOf(arch.getChildren('A'), 0);
                assert.lengthOf(arch.getParents('B'), 0);
            }            
        },

        'Remove tree (simple arch) unforced': {
            topic: function() {
                return getArch1().removeTree('C');
            },
            'removeTree() C unforced': function(arch) {
                assert.equal(arch.hasChildren('A', 'B'), true);
                assert.equal(arch.hasChildren('A', 'C'), false);
                assert.equal(arch.hasChildren('B', 'D'), true);
                assert.equal(arch.hasNode('C'), false);
            }
        },

        'Remove tree (simple arch) forced': {
            topic: function() {
                return getArch1().removeTree('C', true);
            },
            'removeTree() C forced': function(arch) {
                assert.equal(arch.hasChildren('A', 'B'), true);
                assert.equal(arch.hasChildren('A', 'C'), false);
                assert.equal(arch.hasChildren('B', 'D'), false);
                assert.equal(arch.hasNode('C'), false);
                assert.equal(arch.hasNode('D'), false);
            }
        },

        'Remove tree (not so simple arch) unforced': {
            topic: function() {
                return getArch2().removeTree('D');
            },
            'removeTree() D unforced': function(arch) {
                assert.equal(arch.hasChildren('A', 'B'), true);
                assert.equal(arch.hasChildren('B', 'C'), true);
                assert.equal(arch.hasChildren('C', 'F'), true);
                assert.equal(arch.hasChildren('F', 'G'), true);
                assert.equal(arch.hasNode('D'), false);
                assert.equal(arch.hasNode('E'), false);
            }
        },

        'Remove tree (not so simple arch) forced': {
            topic: function() {
                return getArch2().removeTree('D', true);
            },
            'removeTree() D forced': function(arch) {
                assert.equal(arch.hasChildren('A', 'B'), true);
                assert.equal(arch.hasChildren('B', 'C'), true);
                assert.equal(arch.hasChildren('C', 'F'), false);
                assert.equal(arch.hasNode('D'), false);
                assert.equal(arch.hasNode('E'), false);
                assert.equal(arch.hasNode('F'), false);
                assert.equal(arch.hasNode('G'), false);
            }
        },

        'Remove tree (simple arch + plan) unforced': {
            topic: function() {
                var arch = getArch1(),
                    plan = arch.createPlan('A');

                arch.removeTree('C');

                return plan;
            },
            'removeTree() C unforced': function(plan) {
                assert.equal(plan.hasChildren('A', 'B'), true);
                assert.equal(plan.hasChildren('A', 'C'), false);
                assert.equal(plan.hasChildren('B', 'D'), true);
                assert.equal(plan.hasNode('C'), false);
            }
        },


        'Lock': {
            topic: function() {
                var arch = getEmptyArch();

                arch.lock();
                arch.lock();

                return arch;
            },
            'lock() / unlock()': function(arch) {
                assert.equal(arch.locked, 2);
                arch.unlock();
                assert.equal(arch.locked, 1);
                arch.unlock();
                assert.equal(arch.locked, 0);
                arch.unlock();
                assert.equal(arch.locked, 0);
            }
        }

    });

suite.export(module);
