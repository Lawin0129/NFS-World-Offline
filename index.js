const express = require("express");
const app = express();
const fs = require("fs");
const config = require("./Config/config.json");

const functions = require("./utils/functions");
const PORT = 3550;

global.activeDriver = { driver: "", personaId: "" };

app.use((req, res, next) => {
    req.body = "";
    req.on("data", (chunk) => req.body += chunk);
    req.on("end", () => next());
});

app.use((req, res, next) => {
    if (config.LogRequests) console.log(`${req.body ? "\n" : ""}${req.method}`, req.url, req.body ? `${req.body}\n` : "");

    return next();
});

fs.readdirSync("./routes").forEach(fileName => {
    if (fileName.startsWith("Main")) return;
    
    app.use("/Engine.svc", require(`./routes/${fileName}`));
});

app.use("/Engine.svc", require("./routes/Main.js"));

app.listen(PORT, async () => {
    console.log(`NFS World Offline Server by Lawin started listening on port ${PORT}`);
    console.log(`\nLaunch the game either by:`
              + `\n1) Adding the server to the Soapbox Race World Launcher by the url "http://localhost:${PORT}/Engine.svc".`
              + `\n2) or by using these launch args "nfsw.exe US http://localhost:${PORT}/Engine.svc a 1" (not working, use soapbox launcher).\n`);

    await require("./xmpp");
    
    require("./commands");
}).on("error", async (err) => {
    if (err.code == "EADDRINUSE") {
        console.log(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
        await functions.sleep(3000)
        process.exit(0);
    } else throw err;
});