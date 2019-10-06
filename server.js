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
    catch(e){}
    
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
        
        function _checkSession(session, hash, withoutExp)
        {
            let now = Date.now();

            return session.hash === hash
                   && (!withoutExp || session.exp < now);
        }

        function checkSession(sid, hash, withoutExp)
        {
            let res = _this.sessions[sid] ? 
                        _checkSession(_this.sessions[sid], hash, withoutExp) : false; 

            if(!res && _this.sessions[sid]) delete _this.sessions[sid];
            else if(res && !withoutExp) _this.sessions[sid].exp = Date.now() + _this.sessions[sid]._exp;

            return res;
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

                        if(data instanceof Array && data.length > 0)
                        {
                            let id   = data[0];
                            let type = data[1] || "";
                            let hash = data[2] || "";
                            let sess = data[3] || "";

                            let res  = [id];
                            let resReturn = true;

                            if(type === "new" && hash.length > 0)
                            {
                                res.push("new");

                                let expTime   = Number.isInteger(sess) && sess > 0 ? sess : _CONF.expTime;
                                let keyLength = Number.isInteger(data[4]) && data[4] > 0 ? data[4] : _CONF.defaultKeyLength;
                                let base; if(Number.isInteger(data[5])) base = data[5];

                                if(keyLength > _CONF.largestKeyLength) keyLength = _CONF.largestKeyLength;

                                let newSession = {
                                    key:  null,
                                    hash: hash,
                                    exp:  Date.now() + expTime,

                                    _exp: expTime,
                                    _var: {}
                                };

                                if(_worker)
                                {
                                    resReturn = false;

                                    let callback = function(wRes)
                                    {
                                        if(wRes in _this.sessions)
                                            workerCall(callback, "rndstr", [keyLength, base]);
                                        else
                                        {
                                            _this.sessions[wRes] = newSession;
                                            newSession.key = wRes;
                                            res.push(wRes);
                                            socket.write(JSON.stringify(res) + _sep);
                                        }
                                    }
                                    workerCall(callback, "rndstr", [keyLength, base]);
                                }
                                else 
                                {
                                    newSession.key = _.getRandomString(keyLength, base);

                                    while(_this.sessions[newSession.key])
                                        newSession.key = _.getRandomString(keyLength, base);

                                    _this.sessions[newSession.key] = newSession;
                                    res.push(newSession.key);
                                }
                            }
                            else if(type === "check" && hash.length > 0 && sess.length > 0)
                            {
                                res.push("check");
                                res.push(checkSession(sess, hash));
                            }
                            else if(type === "close" && hash.length > 0 && sess.length > 0)
                            {
                                res.push("close");

                                if(checkSession(sess, hash, true))
                                {
                                    _this.sessions[sess] = null;
                                    delete _this.sessions[sess];

                                    res.push(true);
                                }
                                else res.push(false);
                            }
                            else if(type === "set" && hash.length > 0 && sess.length > 0)
                            {
                                res.push("set");
                                res.push(false);

                                let key = 4 in data ? data[4] : null;
                                let val = 5 in data ? data[5] : null;

                                if(checkSession(sess, hash))
                                {
                                    if(typeof key !== "string") key = JSON.stringify(key);

                                    _this.sessions[sess]._var[key] = val;
                                    res[2] = true;
                                }
                            }
                            else if(type === "get" && hash.length > 0 && sess.length > 0)
                            {
                                res.push("get");

                                let key = 4 in data ? data[4] : null;
                                let val = null;

                                if(checkSession(sess, hash))
                                {
                                    if(typeof key !== "string") key = JSON.stringify(key);

                                    if(key && _this.sessions[sess]._var[key])
                                        val = _this.sessions[sess]._var[key];
                                }

                                res.push(key);
                                res.push(val);
                            }
                            else if(type === "ping") res.push("PING");
                            else
                            {
                                res.push("err");
                                res.push("incomprehensible request");
                                res.push(data);
                            }

                            resReturn && res.length > 0 && socket.write(JSON.stringify(res) + _sep);
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

            let clbk = function()
            {
                console.log("[" + (new Date()).toLocaleString() + "] SessionServer"
                                + (_this.isWorker ? " Worker": _this.isMaster ? " Master": "") + " runs on port "
                                + (_this.conf.useInCluster && _this.isMaster ? _this.conf.MASTER_PORT : _this.conf.PORT));
            };
            
            if(_this.conf.useInCluster && _this.isMaster)
                Server.listen(_this.conf.MASTER_PORT, "127.0.0.1", clbk);
            else
                Server.listen(_this.conf.PORT, clbk);

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
