// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_ListenerHTTP(aMap)</key>
 * Provide some explanation of the objective of your input object.
 * On aMap expects:\
 * \
 *    - chKeys\
 *    - useCache\
 * \
 * </odoc>
 */
var nInput_ListenerHTTP = function(aMap) {
    if (!isNull(aMap) && isMap(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "RAID/Listener HTTP";

    nInput.call(this, this.input);
};
inherit(nInput_ListenerHTTP, nInput);

nInput_ListenerHTTP.prototype.get = function(keyData, extra) {
    var ret = {}

    if (!(isDef(keyData) && isDef(keyData.key))) {
        throw "nInput_ListenerHTTP | No key data found: " + af.toSLON(keyData)
    }
    var aKey = keyData.key
    try {
        var obj, edp = []
        var parent = this

        var fnClass = m => {
            var r = $from(Object.keys(m.Services))
                    .starts("wedo.jaf.services.listener.JettyBasedListener")
      
            if (r.none()) return __
            return r.at(0)
        }

        if (isBoolean(parent.useCache)) {
            var res = $cache("nattrmon::" + aKey).get({ op: "StatusReport", args: {} })
            if (isMap(res) && isDef(res.__error)) throw res.__error
            obj = res
        } else {
            nattrmon.useObject(aKey, function (s) {
                try {
                    obj = s.exec("StatusReport", {})
                } catch (e) {
                    logErr("Error while retrieving status report using '" + aKey + "': " + e.message)
                    throw e
                }
            });
        }

        var fnC = fnClass(obj)
        if (isDef(obj.Services) &&
            isDef(fnC) &&
            isDef(obj.Services[fnC].ListenerHTTP)) {
            obj = obj.Services[fnC].ListenerHTTP

            delete obj.ClassName
            if (isArray(obj.servlets)) {
                obj.servlets.forEach(srv => {
                    edp.push(merge({ Key: aKey }, srv))
                })
            }
            delete obj.servlets
        } else {
            obj = {}
        }

    } catch (e) {
        logErr("Error while retrieving status report using '" + aKey + "': " + e.message)
    }

    return { 
        summary : merge({ Key: aKey }, obj),
        servlets: edp 
    }
}

nInput_ListenerHTTP.prototype.input = function(scope, args) {
    var ret = {}

	if (isDef(this.params.chKeys)) {
        var arrSummary = [], arrEDP = []
        $ch(this.params.chKeys).forEach((k, v) => {
            var _r = this.get(merge(k, v))
            arrSummary.push(_r.summary)
            arrEDP = _r.servlets
        })
        ret[templify(this.params.attrTemplate, this.params)] = {
            summary: arrSummary,
            detail: arrEDP
        }
    } else {
        var _r = this.get()
        ret[templify(this.params.attrTemplate, this.params)] = {
            summary: _r.summary,
            detail: _r.servlets
        }
    }

    return ret
}