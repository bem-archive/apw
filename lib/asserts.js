/**
 * Throw error.
 *
 * @param {String} err Error message.
 */
function throwError(err) {
    Error.stackTraceLimit = Infinity;
    throw new Error(err);
}

/**
 * Assert id existence in arch.
 * 
 * @type {Function}
 * @param {String} id id to validate.
 * @param {Arch} arch Arch to use.
 * @param {String} [err] User error message.
 */
var hasId = exports.hasId = function(id, arch, err) {
    if (!arch.hasNode(id)) throwError(err? err : 'There is no such id in arch.nodes: ' + id);
};

/**
 * Assert id absence in arch.
 * 
 * @type {Function}
 * @param {String} id id to validate.
 * @param {Arch} arch Arch to use.
 * @param {String} [err] User error message.
 */
var absentId = exports.absentId = function(id, arch, err) {
    if (arch.hasNode(id)) throwError(err? err : 'There is such id in arch.nodes: ' + id);
};

/**
 * Assert id existence in arch parents and children.
 * 
 * @type {Function}
 * @param {String} id id to validate.
 * @param {Arch} arch Arch to use.
 * @param {String} [err] User error message.
 */
var twoLinksInArch = exports.twoLinksInArch = function(id, arch, err) {
    if (!arch.parents[id]) throwError(err? err : 'There is no such id in arch.parents: ' + id);
    if (!arch.children[id]) throwError(err? err : 'There is no such id in arch.children: ' + id);
};

/**
 * Assert id existence in plan parents and children.
 * 
 * @type {Function}
 * @param {String} id id to validate.
 * @param {Plan} plan Plan to use.
 * @param {String} [err] User error message.
 */
var twoLinksInPlan = exports.twoLinksInPlan = function(id, plan, err) {
    if (!plan.parents[id]) throwError(err? err : 'There is no such id in plan(' + plan.getId() + ').parents: ' + id);
    if (!plan.children[id]) throwError(err? err : 'There is no such id in plan(' + plan.getId() + ').children: ' + id);
};

/**
 * Assert id existence in parents and children.
 * 
 * @type {Function}
 * @param {String} id id to validate.
 * @param {Arch} [arch] Arch to use.
 * @param {Plan} [plan] Plan to use.
 * @param {String} [err] User error message.
 */
var twoLinks = exports.twoLinks = function(id, arch, plan, err) {
    if (arch) twoLinksInArch(id, arch, err);
    if (plan) twoLinksInPlan(id, plan, err);
};

/**
 * Assert ids existence in arch.
 *
 * @type {Function}
 * @param {String[]} ids ids to validate.
 * @param {Arch} [arch] Arch to use.
 * @param {String} [err] User error message.
 */
exports.hasIds = function(ids, arch, err) {
    if (arch) ids.forEach(function(id) { hasId(id, arch, err) });
};

/**
 * Assert id type. It should be 'string' or object with 'getId()'.
 *
 * @type {Function}
 * @param {String|Object} id id to validate.
 * @param {String} [err] User error message.
 */
exports.idTypeIsOk = function(id, err) {
    if (typeof id !== 'string' && !id.getId) throwError(err? err : 'Type of id(' + id + ') is not string and there are no getId function');
};

/**
 * Assert id type. It should be 'string'.
 *
 * @type {Function}
 * @param {String|Object} id id to validate.
 * @param {String} [err] User error message.
 */
exports.idTypeIsString = function(id, err) {
    if (typeof id !== 'string') throwError(err? err : 'Type of id(' + id + ') is ' + typeof id + ', not string.');
};

/**
 * Assert 'id <-> ids' loop. In other words, it is wrong for node 'A' to be a parent / childrent of node 'A'.
 *
 * @type {Function}
 * @param {String} id id to validate.
 * @param {String[]} [parents] Parents container to use.
 * @param {String[]} [children] Children container to use.
 * @param {String} [err] User error message.
 */
exports.noIdLoop = function(id, parents, children, err) {
    if (parents && parents.indexOf(id) !== -1) throwError(err? err : 'Loop found, id is in parents: ' + id);
    if (children && children.indexOf(id) !== -1) throwError(err? err : 'Loop found, id is in children: ' + id);
};

/**
 * Assert 'ids <-> ids' loop. In other words, same node in parents and children is wrong.
 *
 * @type {Function}
 * @param {String[]} [parents] Parents container to use.
 * @param {String[]} [children] Children container to use.
 * @param {String} [err] User error message.
 */
exports.noCrossLoop = function(parents, children, err) {
    if (parents && children) {
        parents.forEach(function(id) {
            if (children.indexOf(id) !== -1) throwError(err? err : 'Parents and children has same id in: ' + id);
        });
    }
};

/**
 * Assert plan is really done.
 *
 * @type {Function}
 * @param {Plan} plan Plan to validate.
 * @param {String} [err] User error message.
 */
exports.planDone = function(plan, err) {
    var k, n = 0;
    if (plan.jobs.length) throwError(err? err : 'There are jobs in plan(' + plan.getId() + ')');
    if (plan.activeJobs.length) throwError(err? err : 'There are active jobs in plan(' + plan.getId() + ')');
    for (k in plan.parents) n++;
    if (n > 1) throwError(err? err : 'There are more than one node in plan(' + plan.getId() + ').parents');
    n = 0;
    for (k in plan.children) n++;
    if (n > 1) throwError(err? err : 'There are more than one node in plan(' + plan.getId() + ').children');
};

/**
 * Assert plan links are two-way links.
 *
 * @type {Function}
 * @param {Plan} plan Plan to validate.
 * @param {String} [err] User error message.
 */
exports.planLinksOk = function(plan, err) {
    var children = plan.children,
        parents = plan.parents,
        k;

    for (k in children) {
        if (!parents[k]) throwError(err? err : 'In plan(' + plan.getId() + ') child(' + k + ') is absent in parents');
    }
    for (k in parents) {
        if (!children[k]) throwError(err? err : 'In plan(' + plan.getId() + ') parent(' + k + ') is absent in children');
    }
};

/**
 * Assert all plan nodes are linked to root or another nodes.
 *
 * @type {Function}
 * @param {Plan} plan Plan to validate.
 * @param {String} [err] User error message.
 */
exports.planNodesLinkedToRoot = function(plan, err) {
    Object.keys(plan.parents).forEach(function(id) {
        if (id == plan.root) return;
        if (!plan.parents[id].length) throwError(err? err: 'In plan(' + plan.getId() + ') node (' + id + ') not linked to root');
    });
};

/**
 * Assert node is not active job and not done job in plan.
 *
 * @type {Function}
 * @param {String} id id to validate.
 * @param {Plan} plan Plan to validate.
 * @param {String} [err] User error message.
 */
exports.notJob = function(id, plan, err) {
    notActiveJob(id, plan, err);
    notDoneJob(id, plan, err);
};

/**
 * Assert node is not active job.
 *
 * @type {Function}
 * @param {String} id id to validate.
 * @param {Plan} plan Plan to validate.
 * @param {String} [err] User error message.
 */
var notActiveJob = exports.notActiveJob = function(id, plan, err) {
    if (plan.isActiveJob(id)) throwError(err? err : 'Node(' + id + ') is active job in plan(' + plan.getId() + ')');
};

/**
 * Assert node is not done job.
 *
 * @type {Function}
 * @param {String} id id to validate.
 * @param {Plan} plan Plan to validate.
 * @param {String} [err] User error message.
 */
var notDoneJob = exports.notDoneJob = function(id, plan, err) {
    if (plan.doneJobs.indexOf(id) !== -1)  throwError(err? err : 'Node(' + id + ') is done job in plan(' + plan.getId() + ')');
};
