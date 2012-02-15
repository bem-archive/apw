exports.dummyCopyObject = function(o) {
    var r = {};

    for (var k in o) r[k] = o[k];

    return r;
};

exports.arrayToObject = function(a, lengthNeeded) {
    var o = {}, n = 0;

    for (var i = 0; i < a.length; i++) {
        if (!o[a[i]]) n++;
        o[a[i]] = 1;
    }

    if (lengthNeeded) o.__length = n;

    return o;
};