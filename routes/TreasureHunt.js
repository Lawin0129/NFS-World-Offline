const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const personaManager = require("../services/personaManager");

// Get treasure hunt info from persona
app.get("/events/gettreasurehunteventsession", (req, res) => {
    res.type("application/xml");

    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    let treasurehuntPath = path.join(activePersona.data.driverDirectory, "gettreasurehunteventsession.xml");

    if (fs.existsSync(treasurehuntPath)) {
        res.send(fs.readFileSync(treasurehuntPath).toString());
    } else {
        res.status(404).end();
    }
});

module.exports = app;