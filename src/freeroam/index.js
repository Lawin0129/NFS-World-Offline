let resolveModule;
module.exports = new Promise((resolve) => resolveModule = resolve);

const dgram = require("dgram");
const udpServer = dgram.createSocket("udp4");
const log = require("../utils/log");
const config = require("../../config/config.json");
const freeroamPackets = require("./packets.json");

let activeFreeroamClient = "";
let packetIdx = 0;
let processingMessage = false;

udpServer.on("message", (msg, rinfo) => {
    if (processingMessage) return;
    processingMessage = true;

    const client = `${rinfo.address}:${rinfo.port}`;
    
    if (activeFreeroamClient != client) {
        activeFreeroamClient = client;
        packetIdx = 0;

        log.freeroam("Freeroam client has connected.");
    }

    packetIdx += 1;

    for (let i = packetIdx; i < freeroamPackets.length; i++) {
        const packetPayload = freeroamPackets[i];
        if (packetPayload == null) break; // null represents client sending to server

        udpServer.send(Buffer.from(packetPayload, "base64"), rinfo.port, rinfo.address);

        packetIdx += 1;
    }

    processingMessage = false;
});

udpServer.on("listening", () => {
    log.freeroam(`Freeroam with fake players is now listening on port ${config.freeroamPORT}`);
    
    resolveModule();
});

udpServer.bind(config.freeroamPORT);
