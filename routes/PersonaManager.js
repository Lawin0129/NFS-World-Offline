const express = require("express");
const app = express.Router();
const xmlParser = require("../utils/xmlParser");
const personaManager = require("../services/personaManager");

// Check if name is available
app.post("/DriverPersona/ReserveName", async (req, res) => {
    const findDriver = await personaManager.getPersonaByName(req.query.name);

    res.type("application/xml").send(findDriver.success ? "<ArrayOfString><string>NONE</string></ArrayOfString>" : "<ArrayOfString/>");
});

// Create driver (persona)
app.post("/DriverPersona/CreatePersona", async (req, res) => {
    res.type("application/xml");

    const createPersona = await personaManager.createPersona(req.query.name, req.query.iconIndex);

    if (createPersona.success) {
        // enable tutorial for newly created drivers by spoofing level
        createPersona.data.ProfileData.Level = ["1"];
        global.newDriver = { personaId: createPersona.data.ProfileData.PersonaId[0], numOfReqs: 0 };

        res.send(xmlParser.buildXML(createPersona.data));
    } else {
        res.status(403).end();
    }
});

// Delete driver (persona)
app.post("/DriverPersona/DeletePersona", async (req, res) => {
    res.type("application/xml");

    const deletePersona = await personaManager.deletePersona(req.query.personaId);

    if (deletePersona.success) {
        res.send("<long>0</long>");
    } else {
        res.status(403).end();
    }
});

module.exports = app;