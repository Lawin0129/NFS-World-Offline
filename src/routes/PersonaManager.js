const express = require("express");
const app = express.Router();
const sharedState = require("../utils/sharedState");
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
        sharedState.data.newDriver = { personaId: createPersona.data.ProfileData.PersonaId[0], numOfReqs: 0 };

        res.send(xmlParser.buildXML(createPersona.data));
    } else {
        res.status(createPersona.error.status).send(createPersona.error.reason);
    }
});

// Delete driver (persona)
app.post("/DriverPersona/DeletePersona", async (req, res) => {
    res.type("application/xml");

    const deletePersona = await personaManager.deletePersona(req.query.personaId);

    if (deletePersona.success) {
        res.send("<long>0</long>");
    } else {
        res.status(deletePersona.error.status).send(deletePersona.error.reason);
    }
});

module.exports = app;