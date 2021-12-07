// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_MinIOMetrics(aMap)</key>
 * Provides data for each storage classes on a bucket
 * On aMap expects:\
 * \
 *    - chKeys       (a channel name for the keys defined in nInput_Init)\
 *    - attrTemplate (a template for the name of the attribute)\
 * \
 * </odoc>
 */
 var nInput_MinIOMetrics = function(aMap) {
    ow.loadMetrics()

    if (isObject(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    // Define default attribute template
    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "Object Storage/MinIO Metrics";

    nInput.call(this, this.input);
};
inherit(nInput_MinIOMetrics, nInput);

// Get data over the provided map:
//   key: the monitoring key
//   bucket: the object storage bucket
//   prefix: the object storage path prefix
//   recursive: if the S3 listObjects operation should be recursive
//   pattern: the pattern to limit the object storage path
nInput_MinIOMetrics.prototype._get = function(aMap) {
    _$(aMap, "_get map").isMap().$_();
    _$(aMap.key, "S3 key").isString().$_();
    aMap.bearerToken = _$(aMap.bearerToken, "S3 Key '" + aMap.key + "' bearer token").default(__)

    var metricsPath = _$(aMap.metricsPath, "S3 Key '" + aMap.key + "' metrics path").isString().default("/minio/v2/metrics/cluster");

    var lst, ret = [], parent = this

    var rh = { "User-Agent": "curl" }
    if (isDef(aMap.bearerToken)) rh.Authorization = "Bearer " + aMap.bearerToken
    var lst = $rest({ requestHeaders: rh }).get(aMap.url + metricsPath)

    if (isUnDef(lst) || (isString(lst) && lst.indexOf("<html") > 0)) {
        throw "Can't retrieve metrics from " + aMap.url + metricsPath
    } else {
        if (isMap(lst) && isDef(lst.error)) throw lst.error
        var lret = ow.metrics.fromOpenMetrics2Array(lst)

        if (isArray(lret)) {
            ret = lret.map(m => {
                var _r = { key: aMap.key, metric: m.metric }
                if (isMap(m.labels)) {
                    if (isString(m.labels.bucket)) {
                        if (!parent.params.all && isDef(aMap.bucket) && aMap.bucket != m.labels.bucket) return __
                    }
                    delete m.labels.server
                    _r = merge(_r, m.labels)
                }
                _r.value = m.value
                return _r
            })
            ret = ret.filter(isDef)
        } else {
            throw "Can't parse metrics from " + aMap.url + metricsPath
        }

        return ret
    }
};

nInput_MinIOMetrics.prototype.input = function(scope, args) {
    var ret = {}, res = [];

    try {
        // Let's check if chKeys is being used
        if (isDef(this.params.chKeys)) {
            this.params.keys = $ch(this.params.chKeys).getKeys().map(r => r.key);

            // for each key
            for(var i in this.params.keys) {
                // get the data from the chKeys
                var v = $ch(this.params.chKeys).get({ key: this.params.keys[i] });
                // Apply $sec transform
                v = __nam_getSec(v);

                // Call _get to get the corresponding array of results per storage class
                res = res.concat(this._get(v));
            }
        } else {
            // If no chKeys are being used it's expected to have the same info in params
            res = this._get(this.params);
        }
    } catch(e) {
        logErr("MinIOMetrics error: "+ stringify(e));
    }

    // Assign to the attribute template name the array of results
    ret[templify(this.params.attrTemplate)] = res;

    return ret;
};
