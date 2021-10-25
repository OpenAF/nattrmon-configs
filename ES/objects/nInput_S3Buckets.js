// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_S3Buckets(aMap)</key>
 * Provides data for each storage classes on a bucket 
 * On aMap expects:\
 * \
 *    - chKeys       (a channel name for the keys defined in nInput_Init)\
 *    - attrTemplate (a template for the name of the attribute)\
 *    - useCache     (optionally the S3Cache initialized in nInput_Init)\
 * \
 * </odoc>
 */
var nInput_S3Buckets = function(aMap) {
    // Ensure the S3 opack is installed
    if (isUnDef(getOPackPath("S3"))) {
        throw "S3 opack not installed.";
    }

    // Load the s3 library
    loadLib("s3.js");

    if (isObject(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    // Define default attribute template
    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "Object Storage/Buckets";

    nInput.call(this, this.input);
};
inherit(nInput_S3Buckets, nInput);

// Get data over the provided map:
//   key: the monitoring key
//   bucket: the object storage bucket
//   prefix: the object storage path prefix
//   recursive: if the S3 listObjects operation should be recursive
//   pattern: the pattern to limit the object storage path
nInput_S3Buckets.prototype._get = function(aMap) {
    _$(aMap, "_get map").isMap().$_();
    _$(aMap.key, "S3 key").isString().$_();
    _$(aMap.bucket, "S3 Key '" + aMap.key + "' bucket").isString().$_();
    var prefix    = _$(aMap.prefix, "S3 Key '" + aMap.key + "' bucket '" + aMap.bucket + "' prefix").isString().default("");
    var recursive = _$(aMap.recursive, "S3 Key '" + aMap.key + "' bucket '" + aMap.bucket + "' recursive").isBoolean().default(false);
    var pattern   = _$(aMap.pattern, "S3 Key '" + aMap.key + "' bucket '" + aMap.bucket + "' pattern").isString().default(__);

    var lst, ret = [];
    // If use cache, try to access the common cache for the provided key
    if (isDef(this.params.useCache)) {
        var res = $cache("nattrmon::" + this.params.useCache + "::" + aMap.key).get({
            fn  : "listObjects",
            args: [aMap.bucket, prefix, false, recursive]
        })
        if (isMap(res) && isDef(res.__error)) throw res.__error;
        if (isArray(res.result)) {
            lst = res;
        }
    } else {
        // If not using cache try to access directly
        var s3 = new S3(aMap.url, aMap.accessKey, aMap.secret, aMap.region);

        // Keep the elapsed time to run listObjects (can be long)
        var init = now();
        var rlst = s3.listObjects(aMap.bucket, prefix, false, recursive);
        var eT = now() - init;
        lst = {
            result: rlst,
            elapsedTimeInMs: eT,
            date: new Date(init)
        }
    }

    // If we have a valid result let's process it
    if (isMap(lst)) {
        // Keep it just for files (even if the s3 library returns directories)
        var ss = $from(lst.result).equals("isFile", true);
        // If pattern was defined, enforce it
        if (isDef(pattern)) ss = ss.match("canonicalPath", pattern);
        
        // Get object storage classes being used
        var lClasses = ss.distinct("storageClass");
        // Insert the 'TOTAL' one to account for all objects in all storage classes
        lClasses.push("TOTAL");

        // For each storage class
        lClasses.forEach(cls => {
            // Repeat the previous filtering by file and pattern
            var sss = $from(lst.result).equals("isFile", true);
            if (isDef(pattern)) sss = sss.match("canonicalPath", pattern);
            // If not TOTAL restrict storageClas
            if (cls != "TOTAL") sss = sss.equals("storageClass", cls);

            // Prepare variables for min and max size and date
            var minSize = sss.min("size");
            var maxSize = sss.max("size");
            var maxDate = sss.max("lastModified");
            var minDate = sss.min("lastModified");
    
            // Prepare and push the information to the return array
            ret.push({
                key             : aMap.key,
                bucket          : aMap.bucket,
                recursive       : recursive,
                prefix          : prefix,
                pattern         : isDef(pattern) ? String(pattern) : "",
                totalObjects    : sss.count(),
                totalSize       : sss.sum("size"),
                minSize         : (isDef(minSize) ? minSize.size : __),
                minSizeTime     : (isDef(minSize) ? new Date(minSize.lastModified) : __),
                maxSize         : (isDef(maxSize) ? maxSize.size : __),
                maxSizeTime     : (isDef(maxSize) ? new Date(maxSize.lastModified) : __),
                avgSize         : Math.round(sss.average("size")),
                newestObject    : (isDef(maxDate) ? new Date(maxDate.lastModified) : __),
                oldestObject    : (isDef(minDate) ? new Date(minDate.lastModified) : __),
                newestObjectSize: (isDef(maxSize) ? maxSize.size : __),
                oldestObjectSize: (isDef(minSize) ? minSize.size : __),
                retrieveTime    : lst.date,
                totalElapsedTime: lst.elapsedTimeInMs,
                class           : cls
            })
        });

        // Return data
        return ret;
    } else {
        return __;
    }
};

nInput_S3Buckets.prototype.input = function(scope, args) {
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
        sprintErr(e);
    }

    // Assign to the attribute template name the array of results 
    ret[templify(this.params.attrTemplate)] = res;

    return ret;
};