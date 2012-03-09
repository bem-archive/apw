var Q = require('qq'),
    INHERIT = require('inherit'),
    Plan = require('./plan'),
    util = require('./util'),

    nodeIDSequence = 1;

module.exports = INHERIT({

    __constructor: function() {
        this.nodes = {};
        this.parents = {};
        this.children = {};
        this.plans = {};
    },

    apply: function(fn) {
        fn.apply(this, Array.prototype.slice.call(arguments, 1));
        return this;
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

        if (!this.parents[id] || (parents && parents !== true)) this.parents[id] = [];
        if (parents && parents !== true) {
            this.link([id], parents);
        }

        if (!this.children[id] || (children && children !== true)) this.children[id] = [];
        if (children && children !== true) {
            this.link(children, [id]);
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
        return {
            id: id,
            node: this.hasNode(id)? this.nodes[id] : this.getDefaultNode(id)
        };
    },

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

    getChildrenIds: function(id) {
        return [].concat(this.children[id] || []);
    },

    getParentsIds: function(id) {
        return [].concat(this.parents[id] || []);
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
            children = this.children[parent] || (this.children[parent] = []);

            if (_parents.indexOf(parent) === -1) _parents.push(parent);
            if (children.indexOf(child) === -1) children.push(child);

            for (var k in this.plans) {
                var p = this.plans[k];
                if (p.hasNode(child) || p.hasNode(parent)) p.link(child, parent);
            }
        }
    },

    unlink: function(id1, id2) {
        util.unlink(this.parents[id1], this.children[id1], id2);
        util.unlink(this.parents[id2], this.children[id2], id1);

        for (var k in this.plans) {
            var p = this.plans[k];
            if (p.hasNode(id1) && p.hasNode(id2)) p.unlink(id1, id2);
        }
    },

    removeNode: function(id) {
        util.removeNode(this.children, this.parents, id);

        delete this.nodes[id];

        for (var k in this.plans) {
            var p = this.plans[k];
            if (p.hasNode(id)) p.removeNode(id);
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
        var _this = this;
        return Object.keys(this.parents).filter(function(id) {
            return !_this.parents[id].length;
        });
    },

    toString: function() {
        var s = 'Graph:\n',
            roots = this.findRoots();

        for (var j = 0; j < roots.length; j++) {
            s += '== root\n' + this.nodeToString(roots[j], ' ');
        }

        return s;
    },

    nodeToString: function(id, spaces) {
        spaces = spaces || ' ';

        var children = this.children[id],
            s = spaces + id + '\n';

        for (var i = 0; i < children.length; i++) {
            s += spaces + this.nodeToString(children[i], spaces + ' ');
        }

        return s;
    }

});
