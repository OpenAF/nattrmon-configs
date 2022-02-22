// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_PinotMetrics(aMap)</key>
 * Provide stats from a Pinot Controller
 * On aMap expects:\
 * \
 *    - url          (String) The URL to the Pinot Controller /metrics endpoint.\
 *    - attrTemplate (String) The attribute template where to store the result.\
 * \
 * </odoc>
 */
 var nInput_PinotMetrics = function(aMap) {
    ow.loadMetrics()

    if (isObject(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "Pinot/Controller stats";

    nInput.call(this, this.input);
};
inherit(nInput_PinotMetrics, nInput);

nInput_PinotMetrics.prototype._get = function(aObj) {
    _$(aObj, "Pinot aObj").isMap().$_()
    _$(aObj.url, "Pinot url (" + af.toSLON(aObj) + ")").isString().$_()

    var metrics = $rest().get(aObj.url + "/metrics")

    // Remove wrong entries
    metrics = metrics.replace(/,}/g, "}")

    var res = ow.metrics.fromOpenMetrics2Array(metrics).map(m => { 
        var _r = { key: aObj.key, metric: m.metric }
        if (isMap(m.labels)) { 
            _r = merge(_r, m.labels) 
        }
        
        _r.value = m.value
        return _r
    })

    return res
}

nInput_PinotMetrics.prototype.input = function(scope, args) {
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
        logErr("PinotMetrics error: " + String(e))
    }

    ret[templify(this.params.attrTemplate)] = res

    return ret

};