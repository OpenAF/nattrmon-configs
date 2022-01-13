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

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "Presto/Coordinator stats";

    nInput.call(this, this.input);
};
inherit(nInput_PrestoCoordinator, nInput);

nInput_PrestoCoordinator.prototype._get = function(aObj) {
    _$(aObj, "Presto aObj").isMap().$_()
    _$(aObj.url, "Presto url (" + af.toSLON(aObj) + ")").isString().$_()

    var info  = $rest({ login: aObj.user, pass: aObj.pass }).get(aObj.url + "/v1/status")
    var cinfo = $rest({ login: aObj.user, pass: aObj.pass }).get(aObj.url + "/v1/cluster")

    return {
        key              : aObj.key,
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
    }
}

nInput_PrestoCoordinator.prototype.input = function(scope, args) {
    var ret = {}, res = []

    try {
        // Let's check if chKeys is being used
        if (isDef(this.params.chKeys)) {
            this.params.keys = $ch(this.params.chKeys).getKeys().map(r => r.key)

            // for each key
            for(var i in this.params.keys) {
                // get the data from the chKeys
                var v = $ch(this.params.chKeys).get({ key: this.params.keys[i] })
                // Apply $sec transform
                v = __nam_getSec(v)

                // Call _get to get the corresponding array of results per storage class
                res = res.concat(this._get(v))
            }
        } else {
            // If no chKeys are being used it's expected to have the same info in params
            res = this._get(this.params)
        }
    } catch(e) {
        logErr("PrestoCoordinator error: " + String(e))
    }

    ret[templify(this.params.attrTemplate)] = res

    return ret

};