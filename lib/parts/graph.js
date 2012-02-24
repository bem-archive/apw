var INHERIT = require('inherit'),
    Plan = require('./plan'),
    Pool = require('./pool'),
    util = require('./util'),
    nodeIDSequence = 1;

module.exports = INHERIT({

    __constructor: function() {
        this.nodes = {};
        this.parents = {};
        this.children = {};
        this.plans = {};
    },

    process: function(targets, maxWorkers, ctx) {
        this.pool = this.pool || (new Pool(maxWorkers, ctx));
        return this.pool.start(this.createPlan(targets));
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

    withLock: function(cb, _this) {
        var err;
        this.lock();
        try {
            cb.apply(_this);
        } catch (e) {
            err = e;
        } finally {
            this.unlock();
        }
        if(err) throw err;
    },

    setNode: function(id, node, parents, children) {
        if (id && typeof id !== 'string') {
            children = parents;
            parents = node;
            node = id;
            id = null;
        }
        if (!id) id = (node.getId && node.getId())? node.getId() : nodeIDSequence++;

        this.nodes[id] = node;

        if (!this.parents[id] || parents !== true) {
            this.parents[id] = [];
            if (parents) this.link([id], parents);
        }

        if (!this.children[id] || children !== true) {
            this.children[id] = [];
            if (children) this.link(children, [id]);
        }

        return id;
    },

    replaceNode: function(id, node) {
        var args = Array.prototype.slice.call(arguments, 0);
        args = (args.length < 2? [null] : []).concat(args, [true, true]);
        return this.setNode.apply(this, args);
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
