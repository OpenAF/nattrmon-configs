// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_PrestoCoordinator(aMap)</key>
 * Provide stats from a Presto Coordinator
 * On aMap expects:\
 * \
 *    - url          (String) The URL to the Presto Coordinator.\
 *    - attrTemplate (String) The attribute template where to store the result.\
 * \
 * </odoc>
 */
var nInput_PrestoCoordinator = function(aMap) {
    if (isObject(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    _$(this.params.url, "url").isString().$_()

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "Presto/Coordinator stats";

    nInput.call(this, this.input);
};
inherit(nInput_PrestoCoordinator, nInput);

nInput_PrestoCoordinator.prototype.input = function(scope, args) {
    var ret = {};

    var info  = $rest({ login: this.params.user, pass: this.params.pass }).get(this.params.url + "/v1/status")
    var cinfo = $rest({ login: this.params.user, pass: this.params.pass }).get(this.params.url + "/v1/cluster")

    ret[templify(this.params.attrTemplate)] = {
        nodeId           : info.nodeId,
        nodeVersion      : info.nodeVersion.version,
        processors       : info.processors,
        cpuLoad          : info.processCpuLoad,
        systemLoad       : info.systemCpuLoad,
        heapUsed         : info.heapUsed,
        heapAvailable    : info.heapAvailable,
        nonHeapUsed      : info.nonHeapUsed,
        runningQueries   : cinfo.runningQueries,
        blockedQueries   : cinfo.blockedQueries,
        queuedQueries    : cinfo.queuedQueries,
        activeWorkers    : cinfo.activeWorkers,
        runningDrivers   : cinfo.runningDrivers,
        reservedMemory   : cinfo.reservedMemory,
        totalInputRows   : cinfo.totalInputRows,
        totalInputBytes  : cinfo.totalInputBytes,
        totalCpuTimeSecs : cinfo.totalCpuTimeSecs,
        adjustedQueueSize: cinfo.adjustedQueueSize
    };

    return ret;
};