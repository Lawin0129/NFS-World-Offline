const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const personaManager = require("../services/personaManager");

// Get treasure hunt info from persona
app.get("/events/gettreasurehunteventsession", (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    let treasurehuntPath = path.join(getActivePersona.data.driverDirectory, "gettreasurehunteventsession.xml");

    if (fs.existsSync(treasurehuntPath)) {
        res.xml(fs.readFileSync(treasurehuntPath).toString());
    } else {
        res.status(404).end();
    }
});

module.exports = app;
