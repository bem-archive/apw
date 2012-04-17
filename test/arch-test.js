var VOWS = require('vows'),
	assert = require('assert'),
    suite = VOWS.describe('Arch'),
    APW = require('../lib/apw');

function getEmptyArch() {
    return new APW.Arch();
}

function getSimpleArch() {
    var arch = getEmptyArch();

    arch.setNode('A', { run: 'testA' });
    arch.setNode('B', { run: 'testB' }, 'A');

    return arch;
}

suite
    .addBatch({
        'Node set / get': {
            topic: getSimpleArch,
            'children': function(arch) {
                assert.lengthOf(arch.children['A'], 1);
                assert.equal(arch.children['A'][0], 'B');
                assert.lengthOf(arch.children['B'], 0);
            }, 
            'parents': function(arch) {
                assert.lengthOf(arch.parents['B'], 1);
                assert.equal(arch.parents['B'][0], 'A');
                assert.lengthOf(arch.parents['A'], 0);
            }, 
            'getNode() A': function(arch) {
                var node = arch.getNode('A');

                assert.equal(node.run, 'testA');
            },
            'getNode() default': function(arch) {
                var node = arch.getNode('XXX');

                assert.equal(node.getId(), 'XXX');
            },
            'getChildrenIds() A': function(arch) {
                var children = arch.getChildrenIds('A');
                
                assert.lengthOf(children, 1);
                assert.equal(children[0], 'B');
            },
            'getParentsIds() B': function(arch) {
                var parents = arch.getParentsIds('B');
                
                assert.lengthOf(parents, 1);
                assert.equal(parents[0], 'A');
            }
        },

        'Node availability check': {
            topic: function() {
                var arch = getEmptyArch();
                
                arch.setNode('A1', { run: 'testA1' });
                arch.setNode('A2', { run: 'testA2' });
                arch.setNode('B', { run: 'testB' }, 'A1');
                arch.setNode('C', { run: 'testC' }, ['A1', 'A2']);
                
                return arch;
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
                assert.lengthOf(arch.getChildrenIds('A'), 0);
            }
        },

        'Node removal (node)': {
            topic: getSimpleArch,
            'removeNode() node A': function(arch) {
                assert.equal(arch.hasNode('A'), true);
                assert.lengthOf(arch.getParentsIds('B'), 1);
                assert.equal(arch.getParentsIds('B')[0], 'A');

                arch.removeNode('A');

                assert.equal(arch.hasNode('A'), false);
                assert.lengthOf(arch.getParentsIds('B'), 0);
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
                var arch = getEmptyArch();
                
                arch.setNode('A', { run: 'testA' });
                arch.setNode('B', { run: 'testA' });
                arch.link('B', 'A');
                arch.link('B', 'A');
                
                return arch;
            },
            'link() B -> A': function(arch) {
                var children = arch.getChildrenIds('A');
                
                assert.lengthOf(children, 1);
                assert.equal(children[0], 'B');

                var parents = arch.getParentsIds('B');
                
                assert.lengthOf(parents, 1);
                assert.equal(parents[0], 'A');
            }            
        },

        'Node unlink': {
            topic: function() {
                var arch = getEmptyArch();

                arch.setNode('A', { run: 'testA' });
                arch.setNode('B', { run: 'testB' }, 'A');
                arch.unlink('B', 'A');
                arch.unlink('B', 'A');

                return arch;
            },
            'unlink() B - A': function(arch) {
                assert.lengthOf(arch.getChildrenIds('A'), 0);
                assert.lengthOf(arch.getParentsIds('B'), 0);
            }            
        },

        'Remove tree (simple arch) unforced': {
            topic: function() {
                var arch = getEmptyArch();

                arch.setNode('A', { run: 'testA' });
                arch.setNode('B', { run: 'testB' }, 'A');
                arch.setNode('C', { run: 'testC' }, 'A');
                arch.setNode('D', { run: 'testD' }, ['B', 'C']);

                arch.removeTree('C');

                return arch;
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
                var arch = getEmptyArch();

                arch.setNode('A', { run: 'testA' });
                arch.setNode('B', { run: 'testB' }, 'A');
                arch.setNode('C', { run: 'testC' }, 'A');
                arch.setNode('D', { run: 'testD' }, ['B', 'C']);

                arch.removeTree('C', true);

                return arch;
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
                var arch = getEmptyArch();

                arch.setNode('A', { run: 'testA' });
                arch.setNode('B', { run: 'testB' }, 'A');
                arch.setNode('D', { run: 'testD' }, 'A');
                arch.setNode('C', { run: 'testC' }, 'B');
                arch.setNode('E', { run: 'testE' }, 'D');
                arch.setNode('F', { run: 'testF' }, ['C', 'E']);
                arch.setNode('G', { run: 'testG' }, 'F');

                arch.removeTree('D');

                return arch;
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
                var arch = getEmptyArch();

                arch.setNode('A', { run: 'testA' });
                arch.setNode('B', { run: 'testB' }, 'A');
                arch.setNode('D', { run: 'testD' }, 'A');
                arch.setNode('C', { run: 'testC' }, 'B');
                arch.setNode('E', { run: 'testE' }, 'D');
                arch.setNode('F', { run: 'testF' }, ['C', 'E']);
                arch.setNode('G', { run: 'testG' }, 'F');

                arch.removeTree('D', true);

                return arch;
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
