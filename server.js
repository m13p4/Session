/* Session Server.
 * 
 * @author Meliantchenkov Pavel
 * @version 1.0
 */
(function(___)
{
    const VERSION = "1.0.not_tested";
    const CONF = {
        expTime:            1000 * 20,
        
        defaultKeyLength:   16,
        largestKeyLength:   255, // 0xff
        
        PORT: 12345
    };
    const _sep = "\t;;\f.?!;;\n";
    
    const os = require('os');
    const net = require('net');
    const _ = require('./helper.js');

    var Worker = false;
    try
    {
        let WorkerThreads = require("worker_threads");
        Worker = WorkerThreads.Worker;
    }
    catch(e){ /* empty */ }
    const staticWorker = require('./serverWorker.js');
    
    function SessionServer() 
    {
        var intervalID, _this = this, _worker = false;
        
        this.conf = null;
        this.server = null;
        this.sessions = {};
        this.sockets = [];

        if(Worker && os.cpus().length > 1)
        {
            _worker = {
                id: 0,
                worker: [],
                callbacks: []
            };

            for(let i = 0; i < os.cpus().length; i++)
            {
                let worker = new Worker(__dirname + "/serverWorker.js", {workerData: i});

                worker.on('message', function(msg)
                {
                    let _i  = msg.i;
                    let id  = msg.id;
                    let res = msg.res;

                    if(_worker.callbacks[_i] && _worker.callbacks[_i][id])
                    {
                        _worker.callbacks[_i][id](res);
                        _worker.callbacks[_i].length--;

                        delete _worker.callbacks[_i][id];
                    }
                });
                _worker.worker.push(worker);
                _worker.callbacks.push({length:0});
            }
        }

        function workerCall(callback, type, args)
        {
            if(_worker)
            {
                let id = _worker.id++;
                let map = {}; let minArr = [];
                for(let i = 0; i < _worker.callbacks.length; i++)
                {
                    minArr.push(_worker.callbacks[i].length);
                    map[_worker.callbacks[i].length] = i;
                }

                let i = map[Math.min.apply(null, minArr)];
                _worker.callbacks[i].length++;
                _worker.callbacks[i][id] = callback;
                _worker.worker[i].postMessage({id:id,type:type,args:args});
            }
        }

        function sendRes(data, socket, res)
        {
            let sid  = data[3] || "";
            let type = data[1] || "";
                        
            if(type === "new")
            {
                let newSess = res.pop();

                if(_this.sessions[newSess.key])
                {
                    let keyLength = Number.isInteger(data[4]) && data[4] > 0 ? data[4] : _CONF.defaultKeyLength;
                    let base; if(Number.isInteger(data[5])) base = data[5];

                    if(_worker)
                    {
                        let callback = function(wRes)
                        {
                            if(wRes in _this.sessions)
                                workerCall(callback, "rndstr", [keyLength, base]);
                            else
                            {
                                newSess.key = wRes;
                                
                                _this.sessions[newSess.key] = newSess;
                                res.push(newSess.key);
                                socket.send(res);
                            }
                        };
                        return workerCall(callback, "rndstr", [keyLength, base]);
                    }
                    else while(_this.sessions[newSess.key])
                        newSess.key = _.getRandomString(keyLength, base);
                }

                _this.sessions[newSess.key] = newSess;
                res.push(newSess.key);
            }
            else if(res[1] !== "err" && res[1] !== "check" && res[2] === true)
            {
                if(type === "set")
                {
                    let key = 4 in data ? data[4] : null;
                    let val = 5 in data ? data[5] : null;

                    if(typeof key !== "string") key = JSON.stringify(key);
                    _this.sessions[sid]._var[key] = val;
                }
                else if(type === "get")
                {
                    let key = 4 in data ? data[4] : null;
                    let val = null;

                    if(typeof key !== "string") key = JSON.stringify(key);

                    if(key && key in _this.sessions[sid]._var)
                        val = _this.sessions[sid]._var[key];

                    res.splice(res.length - 1, 1, key, val);
                }
                else if(type === "close") delete _this.sessions[sid];
            }
            
            res.length > 0 && socket.send(res);
        }
        
        function handleMessage(socket, dataArr)
        {
            let _CONF = _this.conf;
            
            for(let i = 0; i < dataArr.length; i++)
            {
                let data = dataArr[i].trim();
                
                if(data.length > 0)
                {
                    try
                    {
                        data = JSON.parse(data);
                        
                        let sid  = data[3] || "";
                        let type = data[1] || "";
                        let sess = type && type !== "new" && _this.sessions[sid] ? 
                            {
                                hash: _this.sessions[sid].hash,
                                exp:  _this.sessions[sid].exp
                            } : undefined; 
                        
                        if(_worker)
                            workerCall(function(res)
                            {
                                sendRes(data, socket, res);
                            }, "handle", [_CONF, sess, data]);
                        else
                        {
                            let res = staticWorker.handleMessage(_CONF, sess, data);
                            
                            sendRes(data, socket, res);
                        }
                    } catch(e){ /* empty */ }
                }
            }
        }
        
        function _run()
        {
            var Server = net.createServer(function(socket)
            {
                var dataStr = "";
                _this.sockets.push(socket);

                socket.send = function(toSend)
                {
                    try
                    {
                        this.write(JSON.stringify(toSend) + _sep);
                    }
                    catch(e){ console.log("sendErr", e); }
                };

                socket.on("data", function(_d)
                {
                    try
                    {
                        dataStr += _d.toString("utf8");

                        if(dataStr.indexOf(_sep) > -1)
                        {
                            let dataArr = dataStr.split(_sep);
                            dataStr = dataArr.pop();

                            handleMessage(socket, dataArr);
                        }
                    } catch(e) { /* empty */ }
                });

                socket.on("close", function(data)
                {
                    let iof = _this.sockets.indexOf(socket);
                    iof > -1 && _this.sockets.splice(iof, 1);
                });

                socket.on("error", function(err){ console.log(err); });
            });

            Server.listen(_this.conf.PORT, function()
            {
                console.log("[" + (new Date()).toLocaleString() + 
                            "] SessionServer runs on port " + _this.conf.PORT);
            });
            return Server;
        }
        
        this.run = function(cnf)
        {
            this.conf = _.mergeConf(CONF, cnf);
            
            intervalID = setInterval(function()
            {
                let now  = Date.now();

                for(let key in _this.sessions)
                    if(_this.sessions[key].exp < now)
                    {
                        _this.sessions[key] = null;
                        delete _this.sessions[key];
                    }
            }, 1000 * 10);
            
            this.server = _run();
        };
        
        this.stop = function()
        {
            intervalID && clearInterval(intervalID);
            
            if(this.server)
            {
                this.server.close(function(d)
                {
                    console.log("[" + (new Date()).toLocaleString() + "] SessionServer -> stop:", d);
                });
                this.conf     = null;
                this.server   = null;
                this.sessions = {};
                this.sockets  = [];
            }
        };
    }
    ___.exports = SessionServer;
    
})(typeof module !== "undefined" ? module : {});
