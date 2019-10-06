/* Session Server-Worker.
 * 
 * @author Meliantchenkov Pavel
 * @version 1.0
 */
const _ = require("./helper.js");

const WorkerThreads = require("worker_threads");
const parentPort = WorkerThreads.parentPort;
const workerData = WorkerThreads.workerData;

parentPort.on('message', function(msg)
{
    let id   = msg.id;
    let type = msg.type;
    let args = msg.args;

    if(type === "rndstr")
    {
        let str = _.getRandomString.apply(null, args);

        parentPort.postMessage({i:workerData, id:id, res:str});
    }
});
