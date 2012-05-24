var APW = require(process.env.COVER? '../lib-cov/apw' : '../lib/apw');

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