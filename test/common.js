// Bootstrap mocha-as-promised
require('mocha-as-promised')(require('mocha'));

var APW = require('..');

var createNode = exports.createNode = function(id) {
    return {

        getId: function() {
            return id;
        },

        run: function() {
            return 'test' + id;
        }

    };
};

var getEmptyArch = exports.getEmptyArch = function() {
    return new APW.Arch();
};

var getSimpleArch = exports.getSimpleArch = function() {
    /*
        A
        |
        B
        |
        C
    */
    return getEmptyArch()
        .addNode(createNode('A'))
        .addNode(createNode('B'), 'A')
        .addNode(createNode('C'), 'B');
};
