exports.dummyCopyObject = function(o) {
    var r = {};
    for (var k in o) r[k] = o[k];
    return r;
};

exports.arrayToObject = function(a, lengthNeeded) {
    var o = {},
        n = 0;

    for (var i = 0; i < a.length; i++) {
        if (!o[a[i]]) n++;
        o[a[i]] = 1;
    }

    if (lengthNeeded) o.__length = n;

    return o;
};

exports.unlink = function(parents, children, id) {
    var i;
    if ((i = parents.indexOf(id)) !== -1) {
        parents.splice(i, 1);
    }
    if ((i = children.indexOf(id)) !== -1) {
        children.splice(i, 1);
    }
};

// TODO: give 'a' and 'b' other names
exports.removeNode = function(a, b, id) {
    for (var x, i = 0; i < a.length; i++) {
        x = b[a[i]];
        x.splice(x.indexOf(id), 1);
    }
};
