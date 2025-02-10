const express = require("express");
const app = express.Router();
const compression = require("compression");
const powerupManager = require("../services/powerupManager");

// Use powerup
app.post("/powerups/activated/:itemHash", compression({ threshold: 0 }), async (req, res) => {
    await powerupManager.activatePowerup(req.params.itemHash);

    res.status(200).end();
});

module.exports = app;