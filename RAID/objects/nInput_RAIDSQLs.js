/**
 * <odoc>
 * <key>nattrmon.nInput_RAIDSQLs(aMap) : nInput</key>
 * aMap is composed of:\
 *  - keys (a key string or an array of keys for an AF object)\
 *  - chKeys (a channel name for the keys of AF objects)\
 *  - attrTemplate (a template for the name of the attribute)\
 *  - extra (an array of extra map values to include from the chKeys channel values)\
 * \
 * </odoc>
 */
 var nInput_RAIDSQLs = function (aMap, attributePrefix) {
    if (isUnDef(getOPackPath("OpenCli"))) {
        throw "OpenCli opack not installed.";
    }

    if (isMap(aMap)) {
        this.params = aMap;
        // If keys is not an array make it an array.
        if (!(isArray(this.params.keys))) {
            this.params.keys = [this.params.keys];
        }

        if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "RAID/SQLs";
    }

    nInput.call(this, this.input);
}
inherit(nInput_RAIDSQLs, nInput);

nInput_RAIDSQLs.prototype.__get = function (aKey, aExtra) {
    var ret = [];

    try {
        var obj;
        var parent = this;

        var fnClass = m => {
            var r = $from(Object.keys(m.Services))
                .starts("wedo.jaf.services.connector.registry.ConnectorInfoRegistryManagerBase")
      
            if (r.none()) return __
            return r.at(0)
        }

        if (isBoolean(parent.useCache)) {
            var res = $cache("nattrmon::" + aKey).get({ op: "StatusReport", args: {} });
            if (isMap(res) && isDef(res.__error)) throw res.__error;
            obj = res;
        } else {
            nattrmon.useObject(aKey, function (s) {
                try {
                    obj = s.exec("StatusReport", {});
                } catch (e) {
                    logErr("Error while retrieving status report using '" + aKey + "': " + e.message);
                    throw e;
                }
            });
        }

        var fnC = fnClass(obj)
        if (isDef(obj.Services) &&
            isDef(fnC) &&
            isDef(obj.Services[fnC]["AF.ConnectorInfoRegistryManager"])) {
            var tobj = obj.Services[fnC]["AF.ConnectorInfoRegistryManager"].Database;

            $from(tobj)
            .select(r => {
                delete r.WaitList;
                if (isDef(r.InUse)) {
                    $from(r.InUse)
                    .select(s => {
                        traverse(s, (aK, aV, aP, aO) => { 
                            if (isMap(aV) && isDef(aV["__wedo__type__"])) aO[aK] = ow.format.fromWeDoDateToDate(aV);
                            if (isMap(aV) && isDef(aV.ClassName)) delete aV.ClassName;
                        });

                        var info = clone(s);
                        delete info.Statements;

                        if (isArray(s.Statements)) {
                            $from(s.Statements)
                            .select(ss => {
                                ss.Database = r._key;
                                ret.push(merge(info, ss));
                            });
                        }
                    });
                }
            });
        }

        if (isDef(obj.Services) &&
            isDef(obj.Services[fnC])) {
            var tobj = obj.Services[fnC];

            $from(tobj)
            .select(r => {
                delete r.WaitList;
                if (isDef(r.InUse)) {
                    $from(r.InUse)
                    .select(s => {
                        traverse(s, (aK, aV, aP, aO) => { 
                            if (isMap(aV) && isDef(aV["__wedo__type__"])) aO[aK] = ow.format.fromWeDoDateToDate(aV);
                            if (isMap(aV) && isDef(aV.ClassName)) delete aV.ClassName;
                        });

                        var info = clone(s);
                        delete info.Statements;

                        if (isArray(s.Statements)) {
                            $from(s.Statements)
                            .select(ss => {
                                ss.Database = r._key;
                                ret.push(merge(info, ss));
                            });
                        }
                    })
                }
            });
        }
    } catch (e) {
        logErr("Error while retrieving status report using '" + aKey + "': " + e.message);
    }

    ret = merge({ Key: aKey }, ret);

    return ret;
}

nInput_RAIDSQLs.prototype.input = function (scope, args) {
    var res = {};
    var arr = [];

    if (isDef(this.params.chKeys)) this.params.keys = $stream($ch(this.params.chKeys).getKeys()).map("key").toArray().sort();

    for (var i in this.params.keys) {
        var extra = {};
        if (isDef(this.params.chKeys)) {
            var value = $ch(this.params.chKeys).get({ key: this.params.keys[i] });
            if (isDef(value)) {
                for (var j in this.params.extra) {
                    if (isDef(value[this.params.extra[j]])) extra[this.params.extra[j]] = value[this.params.extra[j]];
                }
            }
        }
        arr.push(this.__get(this.params.keys[i], extra));
    }

    res[templify(this.params.attrTemplate)] = arr;
    return res;
}