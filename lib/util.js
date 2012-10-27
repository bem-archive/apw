/**
 * Wrap object in array if it is not array already.
 *
 * @param {Object} o Object to wrap.
 * @returns {Array} Array with this object.
 */
var toArray = exports.toArray = function(o) {
    return Array.isArray(o) ? o : [o];
};

/**
 * Convert array to object.
 *
 * @param {Array} a Array to convert.
 * @returns {Object} Converted array.
 */
exports.arrayToObject = function(a) {
    var o = {},
        n = 0;

    for (var i = 0; i < a.length; i++) {
        if (!o[a[i]]) n++;
        o[a[i]] = 1;
    }

    return o;
};

/**
 * Returns node ID.
 *
 * @param id {String|Object} Node ID or object.
 * @return {String} Node ID.
 */
exports.getNodeId = function(id) {
    return typeof id == 'string'? id : id.getId();
};

/**
 * Unlink node from parents and children.
 *
 * @param {Array} parents Node parents.
 * @param {Array} children Node children.
 * @param {String} id Node ID to unlink.
 */
exports.unlink = function(parents, children, id) {

    var sp = function(arr, id) {
        var i = arr.indexOf(id);
        i !== -1 && arr.splice(i, 1);
    };

    sp(parents, id);
    sp(children, id);

};

/**
 * Remove node from arch and plan parents and children.
 *
 * @param {Object} chAll All arch or plan children.
 * @param {Object} pAll All arch or plan parents.
 * @param {String} id Node ID to remove.
 */
exports.removeNode = function(chAll, pAll, id) {
    _removeNode(chAll[id], pAll, id);
    _removeNode(pAll[id], chAll, id);

    delete chAll[id];
    delete pAll[id];
};

/**
 * Remove node from IDs hash.
 *
 * @param {String[]} ids This node parents or children.
 * @param {Object} all All arch or plan parents or children.
 * @param {String} id Node ID to remove.
 */
function _removeNode(ids, all, id) {
    if (ids) {
        ids.forEach(function(_id) {
            var _ids = all[_id];
            _ids && _ids.splice(_ids.indexOf(id), 1);
        });
    }
}

/**
 * Check if node or nodes has links in specific hash.
 *
 * @param {String} id Node ID to check.
 * @param {Arch} arch Arch to use.
 * @param {String} links Name of the hash to check: 'parents' or 'children' for now.
 * @param {String|String[]} ids This node parents or children.
 * @returns {Boolean} True if yes, otherwise false.
 */
exports.hasLink = function(id, arch, links, ids) {
    if (!arch.hasNode(id)) return false;

    ids = toArray(ids);

    var _links = arch[links][id];

    for (var i = 0; i < ids.length; i++) {
        if (_links.indexOf(ids[i]) === -1) return false;
    }

    return !!ids.length;
};

/**
 * Check if all array elements are covered by object keys.
 *
 * @param {Array} a Array to check.
 * @param {Object} o Object to use.
 * @returns {Boolean} True if yes, otherwise false.
 */
exports.isArrayInObject = function(a, o) {
    for (var i = 0; i < a.length; i++) {
        if (!(a[i] in o)) return false;
    }

    return true;
};

/**
 * Add array elements to object as keys.
 *
 * @param {Array} a Array to add from.
 * @param {Object} o Object to add to.
 * @returns {Object} Same object as in argument.
 */
exports.addArrayToObject = function(a, o) {
    for (var i = 0; i < a.length; i++) {
        o[a[i]] = 1;
    }
    return o;
};

// Use ported jQuery.extend() from `node.extend` module
exports.extend = require('node.extend');

/**
 * Returns arch in the JSON form used by the arch visualization feature.
 * @param {Object} arch Arch (or Plan) to visualize.
 * @param {Object} [nodes] Hash of nodes (required when first argument is Plan).
 * @param {Object} [children] Hash of links (required when first argument is Plan).
 * @return {String}
 */
exports.toJson = function(arch, nodes, children) {
    nodes = nodes || arch.nodes;
    children = children || arch.children;

    var nodesIds = Object.keys(nodes),
        links = [];

    Object.keys(children)
        .filter(function(parent) {
            return children[parent] && children[parent].length > 0;
        })
        .forEach(function(parent) {
            children[parent]
                .forEach(function(c) {
                    links.push({
                        source: nodesIds.indexOf(parent),
                        target: nodesIds.indexOf(c)
                    });
                });
        });

    return JSON.stringify({
        nodes: nodesIds.map(function(r) {
            var node = arch.getNode(r);
            return {
                name: node.getId(),
                type: node.nodeType
            };
        }),

        links: links
    });
};
