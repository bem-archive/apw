var INHERIT = require('inherit'),
    Plan = require('./plan'),
    Pool = require('./pool'),
    util = require('./util'),
    nodeIDSequence = 0;

module.exports = INHERIT({

    __constructor: function() {
        this.nodes = {};
        this.parents = {};
        this.children = {};
        this.plans = {};
    },

    process: function(targets, maxWorkers, method) {
        return (new Pool(this.createPlan(targets), maxWorkers, method)).start();
    },

    lock: function() {
        this.locked = true;

        for (var k in this.plans) {
            this.plans[k].lock();
        }
    },

    unlock: function() {
        this.locked = false;

        for (var k in this.plans) {
            this.plans[k].unlock();
        }
    },

    withLock: function(cb) {
        var err;
        this.lock();
        try {
            cb();
        } catch (e) {
            err = e;
        } finally {
            this.unlock();
        }
        if(err) throw err;
    },

    // TODO: id as first arg, check by typeof == 'string'
    setNode: function(node, id, parents, children) {
        if (!id) id = (node.getId && node.getId())? node.getId() : nodeIDSequence++;

        this.nodes[id] = node;
        this.parents[id] = [];
        this.children[id] = [];

        if (parents) this.link([id], parents);
        if (children) this.link(children, [id]);

        return id;
    },

    hasNode: function(id) {
        return !!this.nodes[id];
    },

    getNode: function(id) {
        return this.hasNode(id) ? { id: id, node: this.nodes[id] } : this.getDefaultNode(id);
    },

    getDefaultNode: function(id) {
        return {
            id: id,
            node: {
                getId: function() {
                    return id;
                },

                run: function() {
                    throw Error("** No rule to make target '" + id + "'");
                }
            }
        };
    },

    link: function(children, parents) {
        if (!Array.isArray(children)) children = [children];
        if (!Array.isArray(parents)) parents = [parents];

        for (var i = 0; i < children.length; i++) {
            this._link(children[i], parents);
        }
    },

    _link: function(child, parents) {
        var _parents = this.parents[child],
            parent,
            children;

        for (var i = 0; i < parents.length; i++) {
            parent = parents[i];
            children = this.children[parent];

            if (_parents.indexOf(parent) === -1) _parents.push(parent);
            if (children.indexOf(child) === -1) children.push(child);

            for (var k in this.plans) {
                this.plans[k].link(child, parent);
            }
        }
    },

    unlink: function(id1, id2) {
        util.unlink(this.parents[id1], this.children[id1], id2);
        util.unlink(this.parents[id2], this.children[id2], id1);

        for (var k in this.plans) {
            this.plans[k].unlink(id1, id2);
        }
    },

    removeNode: function(id) {
        var parents = this.parents[id],
            children = this.children[id];

        util.removeNode(parents, this.children, id);
        util.removeNode(children, this.parents, id);

        delete this.nodes[id];

        for (var k in this.plans) {
            this.plans[k].removeNode(id);
        }
    },

    createPlan: function(targets) {
        return new Plan(this, targets, '__plan_root__');
    },

    registerPlan: function(plan) {
        this.plans[plan.getId()] = plan;
    },

    unregisterPlan: function(plan) {
        delete this.plans[plan.getId()];
    },

    findRoots: function() {
        var roots = [];

        for (var id in this.parents) {
            if (!this.parents[id].length) {
                roots.push(id);
            }
        }

        return roots;
    },

    toString: function() {
        var s = 'Graph:\n',
            roots = this.findRoots();

        for (var j = 0; j < roots.length; j++) {
            s += '== root\n' + this._nodeToString(roots[j], ' ');
        }

        return s;
    },

    _nodeToString: function(id, spaces) {
        var children = this.children[id],
            s = spaces + id + '\n';

        for (var i = 0; i < children.length; i++) {
            s += spaces + this._nodeToString(children[i], spaces + ' ');
        }

        return s;
    }

});
