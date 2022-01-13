// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_PrestoQueries(aMap)</key>
 * Provide queries stats from a Presto Coordinator
 * On aMap expects:\
 * \
 *    - url          (String) The URL to the Presto Coordinator.\
 *    - attrTemplate (String) The attribute template where to store the result.\
 * \
 * </odoc>
 */
var nInput_PrestoQueries = function(aMap) {
    if (isObject(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "Presto/Queries";

    nInput.call(this, this.input);
};
inherit(nInput_PrestoQueries, nInput);

nInput_PrestoQueries.prototype._get = function(aObj) {
    _$(aObj, "Presto aObj").isMap().$_()
    _$(aObj.url, "Presto url (" + af.toSLON(aObj) + ")").isString().$_()

    var info  = $rest({ login: aObj.user, pass: aObj.pass }).get(aObj.url + "/v1/query")

    return info.map(q => ({
        key          : aObj.key,
        queryId      : q.queryId,
        state        : q.state,
        memoryPool   : q.memoryPool,
        scheduled    : q.scheduled,
        query        : q.query,
        createTime   : new Date(q.queryStats.createTime),
        endTime      : new Date(q.queryStats.endTime),
        totalTimeMs  : (isDef(q.queryStats.createTime) ? (new Date((isDef(q.queryStats.endTime) ? q.queryStats.endTime : __)).getTime() - (new Date(q.queryStats.createTime)).getTime()) : __),
        queryType    : q.queryType,
        cumTotalMem  : q.queryStats.cumulativeTotalMemory 
    }))
}

nInput_PrestoQueries.prototype.input = function(scope, args) {
    var ret = {};

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
        logErr("PrestoQueries error: " + String(e))
    }

    ret[templify(this.params.attrTemplate)] = res

    return ret;
};