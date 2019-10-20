/* Session Server-Worker.
 * 
 * @author Meliantchenkov Pavel
 * @version 1.0
 */
const _ = require("./helper.js");

function _handleMessage(_CONF, session, data)
{
    let id   = data[0];
    let type = data[1] || "";
    let hash = data[2] || "";
    let sess = data[3] || "";

    let res  = [id];
    
    if(type === "new" && hash.length > 0)
    {
        res.push("new");

        let expTime   = Number.isInteger(data[3]) && data[3] > 0 ? data[3] : _CONF.expTime;
        let keyLength = Number.isInteger(data[4]) && data[4] > 0 ? data[4] : _CONF.defaultKeyLength;
        let base; if(Number.isInteger(data[5])) base = data[5];

        if(keyLength > _CONF.largestKeyLength) keyLength = _CONF.largestKeyLength;

        res.push({
            key:  _.getRandomString(keyLength, base),
            hash: hash,
            exp:  Date.now() + expTime,

            _exp: expTime,
            _var: {}
        });
    }
    else if((type === "check" || type === "close" || type === "set" || type === "get"))
    {
        res.push(type);
        res.push(hash.length > 0 && sess.length > 0 && session.hash === hash && session.exp > Date.now());
    }
    else if(type === "ping") res.push("PING");
    else
    {
        res.push("err");
        res.push("incomprehensible request");
        res.push(data);
    }

    return res;
}

typeof module !== "undefined" && (module.exports = {
    handleMessage: _handleMessage
});

try // use nodejs >= v12 or '--experimental-worker' option in version >= v10.5
{
    const WorkerThreads = require("worker_threads");
    const parentPort = WorkerThreads.parentPort;
    const workerData = WorkerThreads.workerData;

    parentPort && parentPort.on('message', function(msg)
    {
        let id   = msg.id;
        let type = msg.type;
        let args = msg.args;
        
        let res;
        
        if(type === "rndstr")       res = _.getRandomString.apply(null, args);
        else if(type === "handle")  res = _handleMessage.apply(null, args);
        
        parentPort.postMessage({i:workerData, id:id, res:res});
    });
}
catch(e){ /* empty */ }
