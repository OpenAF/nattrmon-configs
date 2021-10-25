// Author: Nuno Aguiar

// This should be executed before nInput_Init
var nInputInitList = _$(nInputInitList, "nInputInitList").isMap().default({});
nInputInitList["S3"] = {
    name   : "S3",
    type   : "map",
    factory: (parent, ikey, content) => {
        _$(content, "content").isArray().$_();

        $ch(ikey).create();

        // For each init entry store it on the ikey channel
        content.forEach(entry => {
            entry.key  = _$(entry.key, "S3 " + ikey + " entry key").isString().$_();
            entry = parent.setSec(entry);
            
            $ch(ikey).set({ key: entry.key }, entry);
        });
    }
};
nInputInitList["S3Cache"] = {
    name   : "S3Cache",
    type   : "map",
    factory: (parent, ikey, content) => {
        // For each entry build the corresponding cache
        content.forEach(entry => {
            try {
                // Ensure entry has all the info needed
                entry = _$(entry, "S3Cache entry").isMap().$_();
                entry = parent.setSec(entry);
                _$(entry.key, "S3Cache '" + ikey + "' entry key").isString().$_();
                entry.ttl  = _$(entry.ttl, "S3Cache '" + ikey + "' " + entry.key + " ttl key").isNumber().default(__);
                _$(entry.chKeys, "S3Cache '" + ikey + "' " + entry.key + " ttl chKeys").isString().$_();

                // Tell the world that we are going to create the cache
                log("Creating S3 API cache '" + ikey + "' to access '" + entry.key + "' on chKeys='" + entry.chKeys + "'...");
                $cache("nattrmon::" + ikey + "::" + entry.key)
                .ttl(entry.ttl)
                .fn(aK => {
                    // Function expects fn (the s3 library function to call) and args (the function arguments array to use)
                    if (isDef(aK.fn) && isDef(aK.args)) {
                        try {
                            // Try to get the provided key from the chKeys
                            var vv = $ch(entry.chKeys).get({ key: entry.key });
                            if (isUnDef(vv)) {
                                logErr("S3Cache: Key '" + entry.key + "' not found in chKeys='" + entry.chKeys + "'");
                                return __;
                            }

                            // Establish a connection to S3 using the provided arguments
                            var s3 = new S3(vv.url, vv.accessKey, vv.secret, vv.region);

                            // Since the function can take some time to execute keep track of how much time it took
                            // Call the s3 function applying the args array
                            var init = now();
                            var res = s3[aK.fn].apply(s3, aK.args);
                            var eT = now() - init;

                            // Return the result, the elapsed time and the time when the operation started
                            return { result: res, elapsedTimeInMs: eT, date: new Date(init) };
                        } catch(e1) {
                            // If in error return a __error with the exception
                            return { __error: String(e1) }
                        }
                    } else {
                        return { __error: "No function or arguments provided." }
                    }
                })
                .create();
            } catch(e) {
                logErr(e);
            }
        });
    }
};

// Dummy initialization
var nInput_S3Init = function(aMap) {
    nInput.call(this, this.input);
};
inherit(nInput_S3Init, nInput);

nInput_S3Init.prototype.input = function(scope, args) {
    return {};
};