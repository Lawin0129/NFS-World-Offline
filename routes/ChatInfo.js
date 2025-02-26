const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const compression = require("compression");

// Get chat info
app.get("/Session/GetChatInfo", compression({ threshold: 0 }), async (req, res) => {
    let chatInfoPath = path.join(paths.dataPath, `${req.path}.xml`);
    let host = functions.getHost(req.headers["host"]);

    if (fs.existsSync(chatInfoPath)) {
        let parsedChatInfo = await xmlParser.parseXML(fs.readFileSync(chatInfoPath).toString());
        let chatInfo = parsedChatInfo.chatServer;

        if ((chatInfo.ip[0] == "127.0.0.1") || (chatInfo.ip[0] == "localhost")) {
            chatInfo.ip[0] = host.split(":")[0];
            chatInfo.port[0] = `${global.xmppPORT}`;
        }

        res.type("application/xml").send(xmlParser.buildXML(parsedChatInfo));
    } else {
        res.status(404).end();
    }
});

module.exports = app;