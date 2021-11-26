// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_ESIndices(aMap)</key>
 * Provide metrics regarding specific indexes
 * On aMap expects:\
 * \
 *    - chKeys       (a channel name for the keys defined in nInput_Init)\
 *    - attrTemplate (a template for the name of the attribute)\
 * \
 * </odoc>
 */
var nInput_ESIndices = function(aMap) {
    if (isUnDef(getOPackPath("ElasticSearch"))) {
        throw "ElasticSearch opack not installed."
    }

    // Load the ES library
    loadLib("elasticsearch.js")

    if (isObject(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    _$(this.params.indexPrefixes, "indexPrefixes").isArray().$_()

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "ElasticSearch/Indices";

    nInput.call(this, this.input);
};
inherit(nInput_ESIndices, nInput);

nInput_ESIndices.prototype._get = function(aMap) {
    var es = new ElasticSearch(aMap.url, aMap.user, aMap.pass), ret = []

    var r = es.getIndices(true)
    
    for(var iprefix in this.params.indexPrefixes) {
        var prefix = this.params.indexPrefixes[iprefix]

        var res = { key: aMap.key, indexPrefix: prefix }
        var f = $from(r).starts("index", prefix)
    
        if (f.any()) {
            res.numIndices = f.count()
            res.numPrimaryShards = f.sum("primaryShards")
            res.numReplicationShards = f.sum("replicas")
            res.numDocs = f.sum("docsCount")
            res.numDocsDeleted = f.sum("docsDeleted")
            res.totalStorageSize = f.sum("storeSize")
            res.totalPrimaryStorageSize = f.sum("primaryStoreSize") 
            res.numHealthGreen = f.equals("health", "green").count()
            res.numHealthYellow = f.equals("health", "yellow").count()
            res.numHealthRed = f.equals("health", "red").count()
            res.numOpenStatus = f.equals("status", "open").count()  
    
            ret.push(res)  
        }
    }

    return ret
};

nInput_ESIndices.prototype.input = function(scope, args) {
    var ret = {}, res = [];

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

                // Call _get to get the corresponding array of results
                res = res.concat(this._get(v))
            }
        } else {
            // If no chKeys are being used it's expected to have the same info in params
            res = this._get(this.params)
        }
    } catch(e) {
        logErr("ESIndices error: " + String(e))
    }

    ret[templify(this.params.attrTemplate)] = res;

    return ret;
};