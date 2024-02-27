// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_K8SClusterMetrics(aMap)</key>
 * With K8S cluster admin permissions retrieves pod container level statistics regarding cpu, memory and storage.\
 * On aMap expects:\
 * \
 *    - ns           (String)  A comma delimited list of namespaces.\
 *    - raw          (Boolean) Boolean flag to parse requests and limits.\
 *    - includeSA    (Boolean) Boolean flag to include the corresponding service account\
 *    - includeNode  (Boolean) Boolean flag to include the corresponding node\
 *    - includeStats (Boolean) Boolean flag to include extra stats\
 *    - timeout      (Number)  Timeout (in ms) on the stats collected from each node (should be equal or less that the frequency of the input gathering)\
 *    - attrTemplate (String)  The attribute name template\
 * \
 * </odoc>
 */
var nInput_K8SClusterMetrics = function(aMap) {
    if (!isNull(aMap) && isMap(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "K8S/Cluster Metrics"

    this.params.raw          = _$(this.params.raw, "raw").isBoolean().default(true)
    this.params.includeSA    = _$(this.params.includeSA, "includeSA").isBoolean().default(true)
    this.params.includeNode  = _$(this.params.includeNode, "includeNode").isBoolean().default(true)
    this.params.includeStats = _$(this.params.includeStats, "includeStats").isBoolean().default(true)
    this.params.ns           = _$(this.params.ns, "ns").isString().default(__)

    this.params.timeout      = _$(this.params.timeout, "timeout").isNumber().default(30000)

    if (isUnDef(getOPackPath("Kube"))) throw "The Kube oPack is required for nInput_K8SClusterMetrics. Install it using 'opack install Kube'"
    loadLib("kube.js")

    nInput.call(this, this.input)
}
inherit(nInput_K8SClusterMetrics, nInput);

nInput_K8SClusterMetrics.prototype.convValue = function(n, isBytes) {
    // Conversion value function

    if (isNull(n) || isUnDef(n)) return n
    if (this.params.raw) {
      if (isBytes)
        return Number(ow.format.fromBytesAbbreviation(n))
      else
        return Number(ow.format.fromSIAbbreviation(n))
    } else {
      return n
    }
}

nInput_K8SClusterMetrics.prototype.kuletInfo = function(parent, args) {
    // Get ephemeral storage
    $cache("eph")
    .ttl(parent.timeout)
    .fn(k => {
        if (isDef(k) && isDef(k.node)) {
            if (isUnDef(parent.kube)) parent.kube = new Kube()
            var res = jsonParse( parent.kube.client.raw("/api/v1/nodes/" + k.node + "/proxy/stats/summary").toString() )
            return res
        }
    })
    .create()

    var _d = $cache("eph").get({ node: args.node })
    var _p = $from(_d.pods).equals("podRef.name", args.pod).at(0)
    if (isDef(_p)) {
        var _c = $from(_p.containers).equals("name", args.cnt).at(0)
        delete _c.memory.time
        delete _c.rootfs.time
        delete _c.logs.time
        delete _c.cnt

        var res = {
            usageNanoCores   : _c.cpu.usageNanoCores,
            usageCoreNanoSecs: _c.cpu.usageCoreNanoSeconds,
            memory           : _c.memory,
            storage          : {
                rootfs: _c.rootfs,
                logs  : _c.logs
            },
            network          : {
                rxBytes : _p.network.rxBytes,
                rxErrors: _p.network.rxErrors,
                txBytes : _p.network.txBytes,
                txErrors: _p.network.txErrors
            }
        }
        return res
    } else {
        logWarn(`nInput_K8SClusterMetrics | Pod '${args.pod}' not found in node '${args.node}'`)
    }
}

nInput_K8SClusterMetrics.prototype.get = function() {
    var data = new ow.obj.syncArray()
    var parent = this

    // Check each ns
    var f = []
    $kube().getNS().filter(r => isUnDef(this.params.ns) ? true : this.params.ns.split(",").map(s => s.trim()).indexOf(r.Metadata.Name) >= 0).forEach(rns => {
        var ns = rns.Metadata.Name

        var pods = $kube().getFPO(ns).items
        if (isUnDef(pods)) return;

        // Check each pod
        log(`nInput_K8SClusterMetrics | Gathering data from K8S namespace '${ns}' with #${pods.length} pods...`)
        f.push($do(() => {
            pods.forEach(rpo => {
                // Check each container
                cnts = rpo.spec.containers
                cnts.forEach(rc => {
                    try {
                        var _d = {
                            ns: ns,
                            pod: rpo.metadata.name,
                            startTime: ow.format.timeago(rpo.metadata.creationTimestamp),
                            status: rpo.status.phase,
                            container: rc.name,
                            limitCPU  : isUnDef(rc.resources) || isUnDef(rc.resources.limits)   || $from(rc.resources.limits).equals("key", "cpu").none()      ? null : parent.convValue($from(rc.resources.limits).equals("key", "cpu").at(0).value.amount      + $from(rc.resources.limits).equals("key", "cpu").at(0).value.format),
                            limitMEM  : isUnDef(rc.resources) || isUnDef(rc.resources.limits)   || $from(rc.resources.limits).equals("key", "memory").none()   ? null : parent.convValue($from(rc.resources.limits).equals("key", "memory").at(0).value.amount   + $from(rc.resources.limits).equals("key", "memory").at(0).value.format, true),
                            requestCPU: isUnDef(rc.resources) || isUnDef(rc.resources.requests) || $from(rc.resources.requests).equals("key", "cpu").none()    ? null : parent.convValue($from(rc.resources.requests).equals("key", "cpu").at(0).value.amount    + $from(rc.resources.requests).equals("key", "cpu").at(0).value.format),
                            requestMEM: isUnDef(rc.resources) || isUnDef(rc.resources.requests) || $from(rc.resources.requests).equals("key", "memory").none() ? null : parent.convValue($from(rc.resources.requests).equals("key", "memory").at(0).value.amount + $from(rc.resources.requests).equals("key", "memory").at(0).value.format, true)
                        }
                        if (parent.params.includeSA)    _d.svcAccount = rpo.spec.serviceAccountName || rpo.spec.serviceAccount
                        if (parent.params.includeNode)  _d.node       = rpo.spec.nodeName

                        if (parent.params.includeStats) {
                            var _t = parent.kuletInfo(parent, { node: rpo.spec.nodeName, pod: _d.pod, cnt: _d.container })
                            if (isDef(_t)) {
                                delete _t.__id
                                delete _t.objId
                                delete _t.execid
                                _d = merge(_d, _t)
                            } else {
                                logWarn(`nInput_K8SClusterMetrics | Couldn't retrieve info for node=${rpo.spec.nodeName} pod=${_d.pod} container: ${_d.container}.`)
                            }
                        }

                        data.add(_d)
                    } catch(e) {
                        logErr(`nInput_K8SClusterMetrics | ${ns} | ${rc.name} | ${e}`)
                    }
                })
            })
        }))
    })
    $doWait($doAll(f))

    return data.toArray()
}

nInput_K8SClusterMetrics.prototype.input = function(scope, args) {
    var ret = {}

	if (isDef(this.params.chKeys)) {
        var arr = []
        $ch(this.params.chKeys).forEach((k, v) => {
            arr.push(this.get(merge(k, v)))
        })
        ret[templify(this.params.attrTemplate, this.params)] = arr
    } else {
        ret[templify(this.params.attrTemplate, this.params)] = this.get()
    }

    return ret
}