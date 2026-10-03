const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const personaManager = require("../services/personaManager");
const treasureHuntManager = require("../services/treasureHuntManager");

// Get treasure hunt info from active persona
app.get("/events/gettreasurehunteventsession", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    const getTreasureHunt = await treasureHuntManager.getTreasureHuntInfo(getActivePersona.data.personaId);

    if (getTreasureHunt.success) {
        res.xml(getTreasureHunt.data.treasureInfoData);
    } else {
        res.status(getTreasureHunt.error.status).send(getTreasureHunt.error.reason);
    }
});

// Collect treasure hunt gem
app.get("/events/notifycoincollected", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    const collectCoin = await treasureHuntManager.collectCoins(getActivePersona.data.personaId, req.query.coins);

    if (collectCoin.success) {
        res.xml(collectCoin.data ? collectCoin.data : "");
    } else {
        res.status(collectCoin.error.status).send(collectCoin.error.reason);
    }
});

// Get treasure hunt rewards after completion
app.get("/events/accolades", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    const accolades = await treasureHuntManager.getAccolades(getActivePersona.data.personaId);

    if (accolades.success) {
        res.xml(accolades.data);
    } else {
        res.status(accolades.error.status).send(accolades.error.reason);
    }
});

module.exports = app;
