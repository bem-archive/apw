var VOWS = require('vows'),
	assert = require('assert'),
    suite = VOWS.describe('Graph'),
    CORE = require('../lib/core');

function getEmptyArch() {
    return new CORE.Arch();
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
                
                assert.equal(node.id, 'A');
                assert.equal(node.node.run, 'testA');
            },
            'getNode() default': function(arch) {
                var node = arch.getNode('XXX');
                
                assert.equal(node.id, 'XXX');
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
                
                arch.setNode('A', { run: 'testA' });
                
                return arch;
            },
            'hasNode() A': function(arch) {
                assert.equal(arch.hasNode('A'), true);
            },
            'hasNode() absent': function(arch) {
                assert.equal(arch.hasNode('XXX'), false);
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

                return arch;
            },
            'unlink() B - A': function(arch) {
                assert.lengthOf(arch.getChildrenIds('A'), 0);
                assert.lengthOf(arch.getParentsIds('B'), 0);
            }            
        }

    });

suite.export(module);
