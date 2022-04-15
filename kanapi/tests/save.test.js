// using example from uWebSockets
import WebSocket from 'ws';
// import * as uWS from "uWebSockets.js";
import { create_app } from "../src/app.js";
import { kanapiReader } from '../src/utils.js';
import { Buffer } from 'buffer';
import process from "process";

async function delay(time) {
    await new Promise(resolve => setTimeout(resolve, time));
}

const port = 8000;

create_app(port);

await delay(1000);
let msgCount = 0;
const ws = new WebSocket('ws://localhost:' + port, {
    skipUTF8Validation: true
});

ws.on('open', () => {
    /* Mark this socket as opened */
    ws._opened = true;
    ws.send(Buffer.from(JSON.stringify({
        "type": "RUN",
        "payload": {
            "inputs": {
                "files": {
                    "dataset-1": {
                        "format": "H5AD",
                        "h5": "./zeisel.h5ad"
                    }
                },
                "batch": null
            },
            "params": null
        }
    })));
});

/* It seems you can get messages after close?! */
ws.on('message', async (data, isbinary) => {
    const resp = kanapiReader(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    msgCount++;

    // writing my own error checks
    if ((!resp instanceof Object) || (!"type" in resp) ||
        ("error" in resp) || (resp["type"].toLowerCase().indexOf("error") != -1)) {
        console.log("error at step", resp["type"])
        process.abort();
    }

    // after all anlysis responses come back
    if (msgCount == 14) {
        delay(1000);

        ws.send(Buffer.from(JSON.stringify({
            "type": "EXPORT",
            "payload": {}
        })));
    }

    if (msgCount > 14) {
        if (resp["type"] != "export_DATA") {
            process.abort();
        }
        console.log("all done");
        process.exit();
    }
});

ws.on('error', (err) => {
    /* We simply ignore errors. websockets/ws will call our close handler
     * on errors, potentially before even calling the open handler */
    console.error(err);
    process.abort();
});