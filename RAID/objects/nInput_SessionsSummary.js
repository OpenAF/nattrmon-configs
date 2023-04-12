// Author: Nuno Aguiar

/**
 * <odoc>
 * <key>nattrmon.nInput_SessionsSummary(aMap) : nInput</key>
 * You can create an input to check for sessions using a map composed of:\
 *    - keys (a key string or an array of keys for an AF object)\
 *    - chKeys (a channel name for the keys of AF objects)\
 *    - attrTemplate (a string template)\
 * \
 * </odoc>
 */
var nInput_SessionsSummary = function(aMap) {
    if (!isNull(aMap) && isMap(aMap)) {
        this.params = aMap;
    } else {
        this.params = {};
    }

    if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "RAID Server status/Sessions summary";

    nInput.call(this, this.input);
};
inherit(nInput_SessionsSummary, nInput);

nInput_SessionsSummary.prototype.get = function(keyData, extra) {
    extra = _$(extra, "extra").isMap().default(__)
    // Get metrics based on keyData or, if no chKeys is provided, check this.params
    var res = isString(keyData) ? { key: keyData } : {}
    var parent = this, parseResult = false

    var fnClass = m => {
        var r = $from(Object.keys(m.Services))
            .starts("wedo.jaf.services.sessions.SessionManagerBase")

        if (r.none()) return __
        return r.at(0)
    }

    try {
        var aKey = keyData.key
        if (isDef(aKey)) {
			if (isString(parent.params.useCache)) {
				var ses = $cache("nattrmon::" + parent.params.useCache + "::" + aKey).get({ op: "StatusReport", args: { ShowSessionInfo: !0 }})
				if (isMap(ses) && isDef(ses.__error)) throw ses.__error
				var fnC = fnClass(ses)
				ses = (isDef(ses) ? ses = ses.Services[fnC].SessionManager : [])
				parseResult = true
			} else {
				nattrmon.useObject(aKey, s => {
					try {
						ses = s.exec("StatusReport", { ShowSessionInfo: !0 });
						if (isMap(ses) && isDef(ses.Services)) {
							var fnC = fnClass(ses)
							ses = (isDef(ses) ? ses = ses.Services[fnC].SessionManager : [])
							parseResult = true
							return true
						} else {
							return false
						}
					} catch(e) {
						logErr("nInput_SessionsSummary | Error while retrieving sessions using '" + aKey + "': " + e.message);
						return false;
					}
				});
			}
		} else {
			try {
				ses = s.exec("StatusReport", { ShowSessionInfo: !0 })
				var fnC = fnClass(ses)
                if (isUnDef(fnC)) return true
                if (isMap(ses) && isDef(ses.Services) && isDef(fnC)) {
                    ses = ses.Services[fnC];
                    ses = (isDef(ses) ? ses = ses.SessionManager : []);
                    parseResult = true;
                }
			} catch(e) {
				logErr("nInput_SessionsSummary | Error while retrieving sessions: " + e.message);
			}
		}

        if (parseResult) {
			res = {
				key                   : aKey,
				numberOfActiveSessions: ses["Active Sessions"].length,
				activeSessions        : ses["Active Sessions"],
				totalSessions         : ses["Total Sessions"],
				sessionsPeak          : ses["Sessions Peak"]
			}
		} else {
			throw "nInput_SessionsSummary | can't parse results"
		}
    } catch(e) {
        logErr("nInput_SessionsSummary | " + e)
    }

    return merge(res, extra)
}

nInput_SessionsSummary.prototype.input = function(scope, args) {
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
