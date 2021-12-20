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

    _$(this.params.url, "url").isString().$_()

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "Presto/Queries";

    nInput.call(this, this.input);
};
inherit(nInput_PrestoQueries, nInput);

nInput_PrestoQueries.prototype.input = function(scope, args) {
    var ret = {};

    var info  = $rest({ login: this.params.user, pass: this.params.pass }).get(this.params.url + "/v1/query")

    ret[templify(this.params.attrTemplate)] = info.map(q => ({
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

    return ret;
};