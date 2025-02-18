const express = require("express");
const app = express.Router();
const config = require("../Config/config.json");
const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const log = require("../utils/log");
const sbrwManager = require("../services/sbrwManager");

// Get Soapbox server information
app.get("/GetServerInformation", (req, res) => {
    let serverInformationPath = path.join(paths.dataPath, "GetServerInformation.json");

    if (fs.existsSync(serverInformationPath)) {
        res.json(JSON.parse(fs.readFileSync(serverInformationPath).toString()));
    } else {
        res.json({});
    }
});

// Get Soapbox server mod information
app.get("/Modding/GetModInfo", async (req, res) => {
    let host;
    
    if (req.headers["host"]) {
        host = req.headers["host"];
    } else {
        host = "localhost:3550"
    }

    let modInfo = {
        basePath: `http://${host}/Engine.svc/mods`,
        serverID: "LAWIN",
        features: ["[]"]
    };

    const getModInfo = await sbrwManager.getModInfo();

    if (getModInfo.success) {
        modInfo = getModInfo.data;
    } else {
        if ((config.LogRequests) && ((typeof getModInfo.data) == "string")) log.error("GETMODINFO", getModInfo.data);
    }

    res.json(modInfo);
});

// Get Soapbox server mods
app.get("/mods/index.json", (req, res) => {
    res.json({
        "built_at": new Date().toISOString(),
        "entries": []
    });
});

module.exports = app;