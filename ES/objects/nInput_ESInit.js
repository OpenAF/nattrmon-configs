var nInputInitList = _$(nInputInitList, "nInputInitList").isMap().default({})
nInputInitList["ES"] = {
    name   : "ES",
    type   : "map",
    factory: (parent, ikey, content) => {
        _$(content, "content").isArray().$_()

        $ch(ikey).create()

        // For each init entry store it on the ikey channel
        content.forEach(entry => {
            entry.key = _$(entry.key, "ES" + ikey + " entry key").isString().$_()
            entry = parent.setSec(entry)

            $ch(ikey).set({ key: entry.key }, entry)
        })
    }
}

// Dummy initialization
var nInput_ESInit = function(aMap) {
    nInput.call(this, this.input)
}
inherit(nInput_ESInit, nInput)

nInput_ESInit.prototype.input = function(scope, args) {
    return {}
}