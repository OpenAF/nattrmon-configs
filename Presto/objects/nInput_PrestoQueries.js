// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_PrestoQueries(aMap)</key>
 * Provide queries stats from a Presto Coordinator
 * On aMap expects:\
 * \
 *    - url          (String) The URL to the Presto Coordinator.\
 *    - attrTemplate (String) The attribute template where to store the result.\
 *    - stateExlude  (Array) Exclude queries in a given state, defaults to bring everything.\
 *    - stateInclude (Array) Include queries in a given state, defaults to include all states.\
 *    - queryTypeInclude (Array) Include specific query types, defaults to include everything.\
 *    - queryTypeExclude (Array) Exclude specific query types, defaults to not exclude any type.\
 *    - errorTypeInclude (Array) Include specific error types, default to include all types.\ 
 *    - errorTypeExclude (Array) Exclude specific error types, defaults to not exclude any type.\
 *    - howLongAgo   (Integer) Exclude queries started long than X minutes ago, defaults to 3 days.\   
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

    if (isUnDef(this.params.stateInclude)) {
        this.params.stateInclude = [];
    } 
    
    if (isUnDef(this.params.stateExclude)) {
        this.params.stateExclude = [];
    }

    if (isUnDef(this.params.queryTypeInclude)) {
        this.params.queryTypeInclude = [];
    }

    if (isUnDef(this.params.queryTypeExclude)) {
        this.params.queryTypeExclude = [];
    }

    if (isUnDef(this.params.howLongAgo)) {
        this.params.howLongAgo = 4320;
    }

    if (isUnDef(this.params.errorTypeInclude)) {
        this.params.errorTypeInclude = [];
    }

    if (isUnDef(this.params.errorTypeExclude)) {
        this.params.errorTypeExclude = [];
    }

    nInput.call(this, this.input);
};
inherit(nInput_PrestoQueries, nInput);

nInput_PrestoQueries.prototype._get = function(aObj) {
    _$(aObj, "Presto aObj").isMap().$_()
    _$(aObj.url, "Presto url (" + af.toSLON(aObj) + ")").isString().$_()

    var info  = $rest({ login: aObj.user, pass: aObj.pass }).get(aObj.url + "/v1/query")

    if(aObj.stateInclude.length > 0) {
        var sAux = [];            
        for(i in aObj.stateInclude) {
            sAux = sAux.concat($from(info).equals("state", aObj.stateInclude[i]).select());
    }
    info = sAux;
    } else if(aObj.stateExclude.length > 0) {            
        for(i in aObj.stateExclude) {
            info = $from(info).notEquals("state", aObj.stateExclude[i]).select();
        }
    }

    if(aObj.queryTypeInclude.length > 0) {
        var sAux = [];
        for(i in aObj.queryTypeInclude) {
            sAux = sAux.concat($from(info).equals("queryType", aObj.queryTypeInclude[i]).select());
    }
    info = sAux;
    } else if(aObj.queryTypeExclude.length > 0) {
        for(i in aObj.queryTypeExclude) {
            info = $from(info).notEquals("queryType", aObj.queryTypeExclude[i]).select();
        }
    }

    if(aObj.errorTypeInclude.length > 0) {
        var sAux = [];
        for(i in aObj.errorTypeInclude) {
            sAux = sAux.concat($from(info).equals("errorType", aObj.errorTypeInclude[i].toUpperCase()).select());
    }
    info = sAux;
    } else if(aObj.errorTypeExclude.length > 0) {
        for(i in aObj.errorTypeExclude) {
            info = $from(info).notEquals("errorType", aObj.errorTypeExclude[i].toUpperCase()).select();
        }
    }
    
    if(isDef(aObj.howLongAgo)) {
        info = $from(info).where(q => ow.format.dateDiff.inMinutes(new Date(q.queryStats.createTime), new Date()) < aObj.howLongAgo).select(); 
    }

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
        "howLongAgo (Min)": ow.format.dateDiff.inMinutes(new Date(q.queryStats.createTime), new Date()),
        queryType    : q.queryType,
        cumTotalMem  : q.queryStats.cumulativeTotalMemory 
    }))
}

nInput_PrestoQueries.prototype.input = function(scope, args) {
    var ret = {}, res = {}

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