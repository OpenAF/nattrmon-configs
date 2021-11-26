// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_ESCluster(aMap)</key>
 * Provides data for each cluster ES key
 * On aMap expects:\
 * \
 *    - chKeys       (a channel name for the keys defined in nInput_Init)\
 *    - attrTemplate (a template for the name of the attribute)\
 * \
 * </odoc>
 */
var nInput_ESCluster = function(aMap) {
    if (isUnDef(getOPackPath("ElasticSearch"))) {
        throw "ElasticSearch opack not installed."
    }

    // Load the ES library
    loadLib("elasticsearch.js")

    if (isObject(aMap)) {
        this.params = aMap
    } else {
        this.params = {}
    }

    // Define default attribute template
    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "ElasticSearch/Cluster health"

    nInput.call(this, this.input)
}
inherit(nInput_ESCluster, nInput)

nInput_ESCluster.prototype._get = function(aMap) {
    var es = new ElasticSearch(aMap.url, aMap.user, aMap.pass)

    var ret = es.getClusterStats()
    var re2 = es.getClusterHealth()

    var res = {
        nodes                 : ret._nodes.total,
        status                : ret.status,
        totalIndices          : ret.indices.count,
        totalShards           : ret.indices.shards.total,
        totalPrimaryShards    : ret.indices.shards.primaries,
        totalReplicationShards: ret.indices.shards.replication,
        totalDocuments        : ret.indices.docs.count,
        totalDeletedDocuments : ret.indices.docs.deleted,
        unassignedShards      : re2[0].unassing,
        activeShardsPerc      : Number(re2[0].active_shards_percent.replace("%", "")),
        pendingTasks          : re2[0].pending_tasks,
        totalUsedStorageBytes : ret.indices.store.size_in_bytes,
        totalAvailableCPUs    : ret.nodes.os.available_processors,
        totalAllocatedCPUs    : ret.nodes.os.allocated_processors,
        totalMemoryBytes      : ret.nodes.os.mem.total_in_bytes,
        freeMemoryBytes       : ret.nodes.os.mem.free_in_bytes,
        usedMemoryBytes       : ret.nodes.os.mem.used_in_bytes,
        freePercMemory        : ret.nodes.os.mem.free_percent,
        totalStorageBytes     : ret.nodes.fs.total_in_bytes,
        freeStorageBytes      : ret.nodes.fs.free_in_bytes,
        availableStorageBytes : ret.nodes.fs.available_in_bytes,
        minOpenFDs            : ret.nodes.process.open_file_descriptors.min,
        maxOpenFDs            : ret.nodes.process.open_file_descriptors.max,
        avgOpenFDs            : ret.nodes.process.open_file_descriptors.avg
    }

    return res
}

nInput_ESCluster.prototype.input = function(Scope, args) {
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
        logErr("ESCluster error: " + String(e))
    }

    ret[templify(this.params.attrTemplate)] = res

    return ret
}