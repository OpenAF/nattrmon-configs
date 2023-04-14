// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_DBConnections(aMap) : nInput</key>
 * You can create an input to check for sessions using a map composed of:\
 *    - keys (a key string or an array of keys for an AF object)\
 *    - chKeys (a channel name for the keys of AF objects)\
 *    - attrTemplate (a string template)\
 * \
 * </odoc>
 */
var nInput_DBConnections = function(aMap) {
    if (!isNull(aMap) && isMap(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "RAID Server status/DB connections";

    nInput.call(this, this.input);
};
inherit(nInput_DBConnections, nInput);

nInput_DBConnections.prototype.get = function(keyData, extra) {
    extra = _$(extra, "extra").isMap().default(__)
    // Get metrics based on keyData or, if no chKeys is provided, check this.params
    var res = isString(keyData) ? { key: keyData } : {}
    var parent = this, parseResult = false

    var fnClass = m => {
        var r = $from(Object.keys(m.Services))
            .starts("wedo.jaf.services.connector.registry.ConnectorInfoRegistryManagerBase")

        if (r.none()) return __
        return r.at(0)
    }

    try {
        var aKey = keyData.key
        if (isDef(aKey)) {
			if (isString(parent.params.useCache)) {
				var ses = $cache("nattrmon::" + parent.params.useCache + "::" + aKey).get({ op: "StatusReport", args: { }})
				if (isMap(ses) && isDef(ses.__error)) throw ses.__error
				var fnC = fnClass(ses)
				ses = (isDef(ses) ? ses = ses.Services[fnC]["AF.ConnectorInfoRegistryManager"].Database : [])
				parseResult = true
			} else {
				nattrmon.useObject(aKey, s => {
					try {
						ses = s.exec("StatusReport", { });
						if (isMap(ses) && isDef(ses.Services)) {
							var fnC = fnClass(ses)
							ses = (isDef(ses) ? ses = ses.Services[fnC]["AF.ConnectorInfoRegistryManager"].Database : [])
							parseResult = true
							return true
						} else {
							return false
						}
					} catch(e) {
						logErr("nInput_DBConnections | Error while retrieving db connections using '" + aKey + "': " + e.message);
						return false;
					}
				});
			}
		} else {
			try {
				ses = s.exec("StatusReport", { })
				var fnC = fnClass(ses)
                if (isUnDef(fnC)) return true
                if (isMap(ses) && isDef(ses.Services) && isDef(fnC)) {
                    ses = ses.Services[fnC];
                    ses = (isDef(ses) ? ses = ses["AF.ConnectorInfoRegistryManager"].Database : []);
                    parseResult = true;
                }
			} catch(e) {
				logErr("nInput_DBConnections | Error while retrieving db connections using: " + e.message);
			}
		}

        if (parseResult) {
            res = []
            $m4a(ses, "Name").forEach(r => {
                res.push({
                    key: aKey,
                    Name: r.Name, 
                    Connections: r.Connections, 
                    Active: r.Active, 
                    "Average Time for Conns": r.AverageTimeForConns, 
                    "Max Connections" : r.MaxConnections, 
                    Fetches: r.Fetches, 
                    "Average Wait": r.AverageWait, 
                    "Pool out of conns" : r["N.PoolOutOfConns"], 
                    "Wait list": r.WaitList.length, 
                    "In use": r.InUse.length 
                })
            })
		} else {
			throw "nInput_DBConnections | can't parse results"
		}
    } catch(e) {
        logErr("nInput_DBConnections | " + e)
    }

    return merge(res, extra)
}

nInput_DBConnections.prototype.input = function(scope, args) {
    var ret = {}

    /*ret[templify(this.params.attrTemplate)] = {
        something: true
    };*/

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
