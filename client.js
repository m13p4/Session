/* Session Client
 * 
 * @author Meliantchenkov Pavel
 * @version 1.0
 */
(function(___)
{
    const VERSION = "1.0.not_tested";
    const CONF = {
        HOST: "127.0.0.1",
        PORT: 12345
    };
    const _sep = "\t;;\f.?!;;\n";
    
    const net = require('net');
    const _ = require('./helper.js');
    
    
    function emptyCallback(){ /* empty */ }
    
    function SessionClient() 
    {
        var list = {}, _cnt = 0;
        
        this.conf = null;
        this.client = null;
        
        function genID()
        {
            return _.intToStr(_cnt++);
        }
        
        function handleMessage(dataArr)
        {
            for(let i = 0; i < dataArr.length; i++)
            {
                let data = dataArr[i].trim();

                if(data.length > 0)
                {
                    try
                    {
                        data  = JSON.parse(data);

                        let id    = data[0] || false;
                        let type  = data[1] || "";

                        let callback = id && list[id];

                        if(callback)
                        {
                            if(type === "get")       callback(false, data[2], data[3]);
                            else if(type === "err")  callback({
                                message: data[2],
                                req: data[3]
                            });
                            else callback(false, data[2]);

                            list[id] = null;
                            delete list[id];
                        }
                    }
                    catch(e) {console.log(e, "    ", data);}
                }
            }
        }
        
        this.send = function(req)
        {
            this.client.write(JSON.stringify(req) + _sep);
        };
        
        this.connect = function(conf)
        {
            conf = _.mergeConf(CONF, conf);
            this.conf = conf;
            
            this.client = new net.Socket();
            
            this.client.connect(this.conf.PORT, this.conf.HOST, function() 
            {
                console.log("[" + (new Date()).toLocaleString() + "] SessionClient -> connected to " + conf.HOST + ":" + conf.PORT);
            });
            
            var dataStr = "";
            this.client.on("data", function(_d)
            {
                try
                {
                    let chunk = _d.toString("utf8");
                    
                    dataStr += chunk;
                    
                    if(dataStr.indexOf(_sep) > -1)
                    {
                        let dataArr = dataStr.split(_sep);
                        dataStr = dataArr.pop();
                        
                        handleMessage(dataArr);
                    }
                }
                catch(e) { /* empty */ }
            });
        };
        
        this.getNewSessionObj = function(hash, exp, length, base)
        {
            var _this = this,

                newSess = {
                    sessionID: null,
                    hash:      hash,
                    exp:       exp,
                    length:    length,
                    base:      base,

                    new: function(callback)
                    {
                        var __this = this;
                        _this.new(function(err, sessID)
                        {
                            if(!err) __this.sessionID = sessID;

                            callback && callback(err, sessID);

                        }, this.hash, this.exp, this.length, this.base);
                    },
                    check: function(callback)
                    {
                        _this.check(callback, this.hash, this.sessionID);
                    },
                    set: function(callback, key, val)
                    {
                        _this.set(callback, this.hash, this.sessionID, key, val);
                    },
                    get: function(callback, key)
                    {
                        _this.get(callback, this.hash, this.sessionID, key);
                    },
                    close: function(callback)
                    {
                        _this.close(callback, this.hash, this.sessionID);
                    }
                };
            
            newSess.new();
            return newSess;
        };
        
        this.new = function(callback, hash, exp, length, base)
        {
            let id  = genID();
            let req = [id, "new", hash];
            
            exp    && req.push(exp);
            length && req.push(length);
            base   && req.push(base);
            
            list[id] = callback || emptyCallback;
            
            this.send(req);
        };
        
        this.check = function(callback, hash, sid)
        {
            let id  = genID();
            let req = [id, "check", hash, sid];
            
            list[id] = callback || emptyCallback;
            
            this.send(req);
        };
        
        this.close = function(callback, hash, sid)
        {
            let id  = genID();
            let req = [id, "set", hash, sid];
            
            list[id] = callback || emptyCallback;
            
            this.send(req);
        };
        
        this.set = function(callback, hash, sid, key, val)
        {
            let id  = genID();
            let req = [id, "set", hash, sid, key, val];
            
            list[id] = callback || emptyCallback;
            
            this.send(req);
        };
        
        this.get = function(callback, hash, sid, key)
        {
            let id  = genID();
            let req = [id, "get", hash, sid, key];
            
            list[id] = callback || emptyCallback;
            
            this.send(req);
        };
        
        this.ping = function(callback)
        {
            let id  = genID();
            let req = [id, "ping"];
            
            list[id] = callback || emptyCallback;
            
            this.send(req);
        };
    };
    ___.exports = SessionClient;
    
})(typeof module !== "undefined" ? module : {});
