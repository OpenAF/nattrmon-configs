// Author: Nuno Aguiar

var nInputInitList = _$(nInputInitList, "nInputInitList").isMap().default({})
nInputInitList["Presto"] = {
    name   : "Presto",
    type   : "map",
    factory: (parent, ikey, content) => {
        _$(content, "content").isArray().$_()

        $ch(ikey).create()

        // For each init entry store it on the ikey channel
        content.forEach(entry => {
            entry.key = _$(entry.key, "Presto" + ikey + " entry key").isString().$_()
            entry = parent.setSec(entry)

            $ch(ikey).set({ key: entry.key }, entry)
        })
    }
}

// Dummy initialization
var nInput_PrestoInit = function(aMap) {
    nInput.call(this, this.input)
}
inherit(nInput_PrestoInit, nInput)

nInput_PrestoInit.prototype.input = function(scope, args) {
    return {}
}