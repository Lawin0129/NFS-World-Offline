const express = require("express");
const app = express();
const compression = require("compression");
const fs = require("fs");
const config = require("../config/config.json");
const functions = require("./utils/functions");
const log = require("./utils/log");
const personaManager = require("./services/personaManager");
const path = require("path");

if (!config.httpPORT) config.httpPORT = 3550;
if (!config.xmppPORT) config.xmppPORT = 5222;

personaManager.removeActivePersona();

app.use((req, res, next) => {
    res.set("Connection", "close");

    req.body = "";
    req.on("data", (chunk) => req.body += chunk);
    req.on("end", () => next());
});

app.use((req, res, next) => {
    if (config.LogRequests) log.backend(`${req.method} ${req.url} ${req.body}`);
    
    next();
});

app.use(compression({ threshold: 0 }));

for (let fileName of fs.readdirSync(path.join(__dirname, "routes"))) {
    if (fileName.startsWith("Main")) continue;
    
    app.use("/Engine.svc", require(`./routes/${fileName}`));
}

app.use("/Engine.svc", require("./routes/Main"));

app.listen(config.httpPORT, async () => {
    log.backend(`NFS World Offline Server by Lawin started listening on port ${config.httpPORT}`);
    console.log(`\nLaunch the game either by:`
              + `\n1) Adding the server to the Soapbox Race World Launcher by the url "http://127.0.0.1:${config.httpPORT}/Engine.svc".`
              + `\n2) or by using these launch args "nfsw.exe US http://127.0.0.1:${config.httpPORT}/Engine.svc a 1".\n`);

    await require("./xmpp");
    
    require("./commands");
}).on("error", async (err) => {
    if (err.code == "EADDRINUSE") {
        log.error("BACKEND", `Port ${config.httpPORT} is already in use!`);
        log.error("BACKEND", `Closing in 3 seconds...`);
        await functions.sleep(3000);
        process.exit(0);
    } else throw err;
});