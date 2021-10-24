/**
 * <odoc>
 * <key>nattrmon.nInput_RAIDQueryManager(aMap) : nInput</key>
 * aMap is composed of:\
 *  - keys (a key string or an array of keys for an AF object)\
 *  - chKeys (a channel name for the keys of AF objects)\
 *  - attrTemplate (a template for the name of the attribute)\
 *  - extra (an array of extra map values to include from the chKeys channel values)\
 * \
 * </odoc>
 */
 var nInput_RAIDQueryManager = function (aMap, attributePrefix) {
    if (isUnDef(getOPackPath("OpenCli"))) {
       throw "OpenCli opack not installed.";
    }
 
    if (isMap(aMap)) {
       this.params = aMap;
       // If keys is not an array make it an array.
       if (!(isArray(this.params.keys))) {
          this.params.keys = [this.params.keys];
       } 
 
       if (isUnDef(this.params.attrTemplate)) this.params.attrTemplate = "RAID/Query Manager";
    } 
     
    nInput.call(this, this.input);
 }
 inherit(nInput_RAIDQueryManager, nInput);
 
 nInput_RAIDQueryManager.prototype.__get = function (aKey, aExtra) {
    var ret = {};
 
    try {
       var obj;
       var parent = this;
       
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
 
       if (isDef(obj.Services) &&
           isDef(obj.Services["wedo.datamodel.generator.services.QueryGeneratorManager"]) &&
           isDef(obj.Services["wedo.datamodel.generator.services.QueryGeneratorManager"]["DM.QueryGeneratorManager"])) {
             obj = obj.Services["wedo.datamodel.generator.services.QueryGeneratorManager"]["DM.QueryGeneratorManager"];
             delete obj['ClassName'];
             obj = ow.obj.flatMap(obj);
       }
    } catch (e) {
       logErr("Error while retrieving status report using '" + aKey + "': " + e.message);
    }
 
    ret = merge({ Name: aKey }, obj);
 
    return ret;
 }
 
 nInput_RAIDQueryManager.prototype.input = function (scope, args) {
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