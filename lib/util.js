var UTIL = require('util');

/**
 * Wrap object in array if it is not array already.
 *
 * @param {Object} o Object to wrap.
 * @returns {Array} Array with this object.
 */
var toArray = exports.toArray = function(o) { return Array.isArray(o) ? o : [o] };

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

/**
 * Adopted from jquery's extend method. Under the terms of MIT License.
 *
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by mscdex to use Array.isArray instead of the custom isArray method
 */
exports.extend = function() {
    // copy reference to target object
    var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

    // Handle a deep copy situation
    if (typeof target === 'boolean') {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== 'object' && !typeof target === 'function')
        target = {};

    var isPlainObject = function(obj) {
        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
            return false;

        var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
        var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');
        // Not own constructor property must be Object
        if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
            return false;

        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.

        var key, last_key;
        for (key in obj)
            last_key = key;

        return typeof last_key === 'undefined' || hasOwnProperty.call(obj, last_key);
    };


    for (; i < length; i++) {
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) !== null) {
            // Extend the base object
            for (name in options) {
                if (!options.hasOwnProperty(name))
                    continue;
                src = target[name];
                copy = options[name];

                // Prevent never-ending loop
                if (target === copy)
                    continue;

                // Recurse if we're merging object literal values or arrays
                if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
                    var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

                    // Never move original objects, clone them
                    target[name] = extend(deep, clone, copy);

                // Don't bring in undefined values
                } else if (typeof copy !== 'undefined')
                    target[name] = copy;
            }
        }
    }

    // Return the modified object
    return target;
};

/**
 * Returns arch in the JSON form used by the arch visualization feature.
 * @param {Object} arch Arch (or Plan) to visualize.
 * @param {Object} [nodes] Hash of nodes (required when first argument is Plan).
 * @param {Object} [children] Hash of links (required when first argument is Plan).
 * @return {String}
 */
exports.toJson = function(arch, nodes, children) {
    var nodes = nodes || arch.nodes,
        children = children || arch.children,
        nodesIds = Object.keys(nodes),
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
}
