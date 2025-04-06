const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const config = require("../../config/config.json");

// Get rebroadcasters
app.get("/getrebroadcasters", async (req, res) => {
    let rebroadcastersPath = path.join(paths.dataPath, `${req.path}.xml`);
    let host = functions.getHost(req.headers["host"]);

    if (fs.existsSync(rebroadcastersPath)) {
        let parsedRebroadcasters = await xmlParser.parseXML(fs.readFileSync(rebroadcastersPath).toString());
        let udpRelayInfo = parsedRebroadcasters.ArrayOfUdpRelayInfo.UdpRelayInfo[0];

        if ((udpRelayInfo.Host[0] == "127.0.0.1") || (udpRelayInfo.Host[0] == "localhost")) {
            udpRelayInfo.Host[0] = host.split(":")[0];
            udpRelayInfo.Port[0] = `${config.freeroamPORT}`;
        }

        res.xml(parsedRebroadcasters);
    } else {
        res.status(404).end();
    }
});

module.exports = app;
