setTitle("NFS World Offline by Lawin");

const express = require("express");
const app = express();
const compression = require("compression");
const fs = require("fs");
const config = require("../config/config.json");
const functions = require("./utils/functions");
const log = require("./utils/log");
const xmlParser = require("./utils/xmlParser");
const personaManager = require("./services/personaManager");
const path = require("path");

if (!config.httpPORT) config.httpPORT = 3550;
if (!config.xmppPORT) config.xmppPORT = 5222;
if (!config.freeroamPORT) config.freeroamPORT = 9999;

personaManager.removeActivePersona();

express.response.xml = function (body) {
    if ((typeof body) == "object") body = xmlParser.buildXML(body);
    if ((typeof body) != "string") {
        this.status(500);
        body = "<Error>Failed parsing XML response.</Error>";
    }

    this.type("application/xml").send(body);
};

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
    console.log("If you like this offline server, please star the repo at \"https://github.com/Lawin0129/NFS-World-Offline\"!\n");

    await require("./xmpp");

    if (config.FakeFreeroamPlayers) await require("./freeroam");
    
    require("./commands");
}).on("error", async (err) => {
    if (err.code == "EADDRINUSE") {
        log.error("BACKEND", `Port ${config.httpPORT} is already in use!`);
        log.error("BACKEND", `Closing in 3 seconds...`);
        await functions.sleep(3000);
        process.exit(0);
    } else throw err;
});

function setTitle(title) {
    if (process.platform == "win32") {
        process.title = title;
    } else {
        process.stdout.write("\x1b]2;" + title + "\x1b\x5c");
    }
}
