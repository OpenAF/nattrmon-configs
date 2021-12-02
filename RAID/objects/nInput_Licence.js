/**
 * <odoc>
 * <key>nattrmon.nInput_Licence(aMap) : nInput</key>
 * Retrieves RAID licence specific information. aMap is composed of:\
 *  - keys (a key string or an array of keys for an AF object)\
 *  - chKeys (a channel name for the keys of AF objects)\
 *  - attrTemplate (a template for the name of the attribute)\
 *  - extra (an array of extra map values to include from the chKeys channel values)\
 * \
 * </odoc>
 */
var nInput_Licence = function (aMap, attributePrefix) {
    if (isUnDef(getOPackPath("OpenCli"))) {
        throw "OpenCli opack not installed.";
    }

    if (isMap(aMap)) {
        this.params = aMap;
        // If keys is not an array make it an array.
        if (!(isArray(this.params.keys))) {
            this.params.keys = [this.params.keys];
        }

        if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "RAID/Licence";
    }

    nInput.call(this, this.input);
}
inherit(nInput_Licence, nInput);

nInput_Licence.prototype.__get = function (aKey, aExtra) {
    var ret = {};

    try {
        var obj;
        var parent = this;

        nattrmon.useObject(aKey, function (s) {
            try {
                obj = s.exec("GetLicenceDetails", {})
            } catch (e) {
                logErr("Error while retrieving licence details using '" + aKey + "': " + e.message)
                throw e;
            }
        });

        if (isDef(obj) && isArray(obj.LicenceDetails)) {
            obj = obj.LicenceDetails

            obj = obj.map(r => {
                traverse(r, (aK, aV, aP, aO) => { if (!isNull(aV) && isMap(aV) && isDef(aV["__wedo__type__"])) aO[aK] = ow.format.fromWeDoDateToDate(aV) })

                if (isString(r.LicencedModules)) r.LicencedModules = r.LicencedModules.replace(/\n/g, ", ")

                return r
            })
        }
    } catch (e) {
        logErr("Error while retrieving licence details using '" + aKey + "': " + e.message)
    }

    ret = merge({ Key: aKey }, obj);

    return ret;
}

nInput_Licence.prototype.input = function (scope, args) {
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
        arr = arr.concat(this.__get(this.params.keys[i], extra));
    }

    res[templify(this.params.attrTemplate)] = arr;
    return res;
}