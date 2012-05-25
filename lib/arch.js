var Q = require('q'),
    INHERIT = require('inherit'),
    ASSERTS = require('./asserts'),
    Plan = require('./plan'),
    U = require('./util'),

    arraySlice = Array.prototype.slice;

module.exports = INHERIT(/** @lends Arch.prototype */ {

    /**
     * Create an instance of Arch.
     *
     * @class Arch
     * @constructs
     */
    __constructor: function() {
        this.nodes = {};
        this.parents = {};
        this.children = {};
        this.plans = {};
        this.locked = 0;
    },

    /**
     * Apply function on this Arch.
     *
     * @param {Function} fn Function to apply.
     * @returns {Arch} Chainable API.
     */
    apply: function(fn) {
        fn.apply(this, arraySlice.call(arguments, 1));
        return this;
    },

    /**
     * Lock this arch and it's plans.
     *
     * @returns {Arch} Chainable API.
     */
    lock: function() {
        this.locked++;

        Object.keys(this.plans).forEach(function(k) {
            this.plans[k].lock();
        }, this);

        return this;
    },

    /**
     * Unlock this arch and its plans.
     *
     * @returns {Arch} Chainable API.
     */
    unlock: function() {
        if (this.locked) this.locked--;

        Object.keys(this.plans).forEach(function(k) {
            this.plans[k].unlock();
        }, this);

        return this;
    },

    /**
     * Call function inside lock()/unlock() pair.
     *
     * @param {Function} cb Function to call.
     * @param {Object} context Call context.
     * @returns {Promise}.
     */
    withLock: function(cb, context) {
        var _this = this;
        this.lock();
        return Q.call(cb, context)
            .fin(function() {
                _this.unlock();
            });
    },

    /**
     * Return node by ID.
     * If there is no such node, return default node.
     *
     * @param {String} id Node id
     * @returns {Object} Node object
     */
    getNode: function(id) {
        return this.hasNode(id)? this.nodes[id] : this.getDefaultNode(id);
    },

    /**
     * Create and return default node with specified ID.
     *
     * Returned node does not belong to this Arch.
     * It will return rejected promise on run() call.
     *
     * @param {String} id ID of node to create.
     * @returns {Object} Default node object
     */
    getDefaultNode: function(id) {
        return {
            getId: function() {
                return id;
            },

            run: function() {
                return Q.reject("** No rule to make target '" + id + "'");
            }
        };
    },

    /**
     * Add new node to arch.
     *
     * @param {Object} node Node to add
     * @param {String[]|String} [parents] Node parents to link with
     * @param {String[]|String} [children] Node children to link with
     * @throws AssertionError In case of there is node with same id in the arch already
     * @return {Arch} Chainable API.
     */
    addNode: function(node, parents, children) {
        ASSERTS.absentId(node, this);

        var id = node.getId();

        this.nodes[id] = node;

        // NOTE: we are letting here premature linking with
        // not already existant nodes
        this.parents[id] = this.parents[id] || [];
        this.children[id] = this.children[id] || [];

        parents && this.link([id], parents);
        children && this.link(children, [id]);

        return this;
    },

    /**
     * Add new node or replace existing node having same id with specified.
     *
     * If node exists and parents and children arguments are not specified
     * then links with other nodes will left unchanged.
     *
     * @param {Object} node Node to add or replace
     * @param {String[]|String} [parents] Node parents to link with
     * @param {String[]|String} [children] Node children to link with
     * @return {Arch} Chainable API.
     */
    setNode: function(node, parents, children) {
        return this.hasNode(node)
            ? this.replaceNode(node, parents, children)
            : this.addNode(node, parents, children);
    },

    /**
     * Replace existing node in arch with specified.
     *
     * @param {Object} node Node to add or replace
     * @param {String[]|String} [parents] Node parents to link with
     * @param {String[]|String} [children] Node children to link with
     * @throws AssertionError In case of there is no node with same id in the arch
     * @return {Arch} Chainable API.
     */
    replaceNode: function(node, parents, children) {
        ASSERTS.hasId(node, this);

        var id = node.getId();

        if (parents || children) {
            this.removeNode(id);
            return this.addNode(node, parents, children);
        }

        this.nodes[id] = node;

        return this;
    },

    /**
     * Remove node from arch.
     *
     * @param {String|Object} id Node to remove (ID or node object with getId())
     * @returns {Arch} Chainable API.
     */
    removeNode: function(id) {
        id = U.getNodeId(id);
        U.removeNode(this.children, this.parents, id);

        delete this.nodes[id];

        for (var k in this.plans) {
            var p = this.plans[k];
            if (p.hasNode(id)) p.removeNode(id);
        }

        return this;
    },

    /**
     * Check if node exists in this arch.
     *
     * @param {String|Object} id Node to check (ID or node object with getId()).
     * @returns {Boolean} True if exists, otherwise false.
     */
    hasNode: function(id) {
        return !!this.nodes[U.getNodeId(id)];
    },

    /**
     * Check if node with such ID has parents with provided IDs.
     *
     * @param {String|Object} id Node to check (ID or node object).
     * @param {String|String[]} parents IDs of parents to check.
     * @returns {Boolean} True if all IDs are parent for this child, otherwise false.
     */
    hasParents: function(id, parents) {
        ASSERTS.idTypeIsOk(id);
        ASSERTS.hasId(id, this);

        return U.hasLink(U.getNodeId(id), this, 'parents', parents);
    },

    /**
     * Check if node with such ID has children with provided IDs.
     *
     * @param {String|Object} id Node to check (ID or node object).
     * @param {String|String[]} children Child IDs to check.
     * @returns {Boolean} True if all IDs are children for this parent, otherwise false.
     */
    hasChildren: function(id, children) {
        ASSERTS.idTypeIsOk(id);
        ASSERTS.hasId(id, this);

        return U.hasLink(U.getNodeId(id), this, 'children', children);
    },

    /**
     * Return node children IDs.
     *
     * @param {String|Object} id Node (ID or node object).
     * @returns {Array} Children IDs.
     */
    getChildren: function(id) {
        ASSERTS.idTypeIsOk(id);
        ASSERTS.hasId(id, this);

        return [].concat(this.children[U.getNodeId(id)] || []);
    },

    /**
     * Return node parent IDs.
     *
     * @param {String|Object} id Node (ID or node object).
     * @returns {Array} Parent IDs.
     */
    getParents: function(id) {
        ASSERTS.idTypeIsOk(id);
        ASSERTS.hasId(id, this);

        return [].concat(this.parents[U.getNodeId(id)] || []);
    },

    /**
     * Link specified children to node.
     *
     * @param {String|Object} id Node (ID or node object).
     * @param {String[]|String} children Children nodes IDs.
     * @return {Arch}
     */
    addChildren: function(id, children) {
        return this.link(children, U.getNodeId(id));
    },

    /**
     * Link specified parents to node.
     *
     * @param {String|Object} id Node (ID or node object).
     * @param {String[]|String} parents Parents nodes IDs.
     * @return {Arch}
     */
    addParents: function(id, parents) {
        return this.link(U.getNodeId(id), parents);
    },

    /**
     * Link nodes.
     *
     * @param {String[]|String} children IDs of child nodes.
     * @param {String[]|String} parents IDs of parent nodes.
     * @returns {Arch} Chainable API.
     */
    link: function(children, parents) {
        children = U.toArray(children);
        parents = U.toArray(parents);

        ASSERTS.hasIds(children, this);
        ASSERTS.hasIds(parents, this);

        children.forEach(function(child) {
            this._link(child, parents);
        }, this);

        return this;
    },

    /**
     * Link child node with parents.
     *
     * @param {String} child Child node ID.
     * @param {Array} parents Parent nodes IDs.
     */
    _link: function(child, parents) {
        child = U.getNodeId(child);

        var _parents = this.parents[child],
            children;

        parents.forEach(function(parent) {
            parent = U.getNodeId(parent);

            if (this.hasParents(child, parent)) return;

            children = this.children[parent] || (this.children[parent] = []);

            if (_parents.indexOf(parent) === -1) _parents.push(parent);
            if (children.indexOf(child) === -1) children.push(child);

            for (var k in this.plans) {
                var p = this.plans[k];
                if (p.hasNode(child) || p.hasNode(parent)) p.link(child, parent);
            }
        }, this);
    },

    /**
     * Unlink linked (child-parent) nodes.
     *
     * @param {String} id1 First node ID to unlink.
     * @param {String} id2 Second node ID to unlink.
     * @returns {Arch} Chainable API.
     */
    unlink: function(id1, id2) {
        ASSERTS.idTypeIsOk(id1);
        ASSERTS.idTypeIsOk(id2);
        ASSERTS.hasId(id1, this);
        ASSERTS.hasId(id2, this);

        U.unlink(this.parents[id1], this.children[id1], id2);
        U.unlink(this.parents[id2], this.children[id2], id1);

        for (var k in this.plans) {
            var p = this.plans[k];
            if (p.hasNode(id1) && p.hasNode(id2)) p.unlink(id1, id2);
        }

        return this;
    },

    /**
     * Remove tree from arch.
     * Use forced removal to remove nodes with links to other parents (not belonging to removed tree).
     * So in "A->[B,C]->D" arch (D is the child of both B and C) forced removal will remove D node.
     *
     * @param {String} id Tree root node ID.
     * @param {Boolean} forced Remove child nodes with links to other parents too.
     * @returns {Arch} Chainable API.
     */
    removeTree: function(id, forced) {
        ASSERTS.idTypeIsOk(id);
        ASSERTS.hasId(id, this);

        var children = this.children[id];

        children.forEach(function(cId) {
            this._removeTree(cId, forced);
        }, this);

        this.removeNode(id);

        return this;
    },

    _removeTree: function(id, forced) {
        if (this.parents[id].length === 1 || forced) {
            var children = this.children[id];

            children.forEach(function(cId) {
                this._removeTree(cId, forced);
            }, this);

            this.removeNode(id);
        }
    },

    /**
     * Create plan instance from this arch.
     * Targets are (is) node IDs to run. If you have A -> B -> C arch and it is needed to build 'A', you target is 'A'.
     *
     * @param {String[]|String} targets Node IDs to build.
     * @returns {Plan} Newly created plan.
     */
    createPlan: function(targets) {
        targets = U.toArray(targets);

        ASSERTS.hasIds(targets, this);

        var _this = this,
            plan = new Plan(this, targets, '__plan_root__');

        // register plan
        this.plans[plan.getId()] = plan;

        // unregister plan
        plan.on('allDone', function() {
            delete _this.plans[plan.getId()];
        });

        return plan;
    },

    /**
     * Return IDs of root (without parents) nodes.
     *
     * @returns {String[]} IDs of root nodes.
     */
    findRoots: function() {
        return Object.keys(this.parents).filter(function(id) {
            return !this.parents[id].length;
        }, this);
    },

    /**
     * Dump this arch to string for debug purposes.
     *
     * @returns {String} String representation of this arch.
     */
    toString: function() {
        return 'Graph:\n' +
            this.findRoots().map(function(r) {
                    return '== root\n' + this.nodeToString(r, ' ')
                }, this).join('')
    },

    /**
     * Dump this arch to string in Graphviz format for debug purposes.
     *
     * @returns {String} Graphviz string representation of this arch.
     */
    toGraphviz: function() {
        return 'digraph G {\n' +
            this.findRoots().map(function(r) {
                    return this.nodeToGraphviz(r)
                }, this).join('') + '}\n';
    },

    /**
     * Dump node with its children to string.
     *
     * @param {String} id Node ID to dump.
     * @param {String} spaces Left indent spaces.
     * @returns {String} String representation of specified node.
     */
    nodeToString: function(id, spaces) {
        spaces = spaces || ' ';

        return spaces + id + '\n' +
            this.children[id].map(function(c) {
                    return spaces + this.nodeToString(c, spaces + ' ')
                }, this).join('')
    },

    /**
     * Dump node with its children to string in Graphviz format.
     *
     * @param {String} id Node ID to dump.
     * @returns {String} Graphviz string representation of specified node.
     */
    nodeToGraphviz: function(id, done) {
        var thisNode = '"' + id + '"',
            s = '    ' + thisNode + ';\n',
            children = this.children[id] || [];

        if (!(id in done)) done[id] = {};

        children.forEach(function(child) {
            if (!done[id][child]) {
                s += '    ' + thisNode + ' -> "' + child + '";\n';
            }
        });
        children.forEach(function(child) {
            if (!done[id][child]) {
                done[id][child] = 1;
                s += this.nodeToGraphviz(child, done);
            }
        }, this);

        return s;
    }

});
