const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");

// Game guide
app.get("/webkit/guide", (req, res) => {
    res.type("html")

    let gameGuidePath = path.join(__dirname, "..", "data", "gameguide", "index.html");

    if (fs.existsSync(gameGuidePath)) {
        res.send(fs.readFileSync(gameGuidePath).toString());
    } else {
        res.send("<p>NFS World Offline by Lawin</p>");
    }
});

module.exports = app;