const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");

// Get treasure hunt info from persona
app.get("/events/gettreasurehunteventsession", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let file = `./drivers/${global.activeDriver.driver}/gettreasurehunteventsession.xml`;

    if (!global.activeDriver.driver) return res.status(404).send("<EngineError><Message>No active persona</Message></EngineError>");

    if (fs.existsSync(file)) res.send(fs.readFileSync(file).toString());
    else res.status(200).end();
});

module.exports = app;