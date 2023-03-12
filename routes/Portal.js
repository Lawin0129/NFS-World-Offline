const express = require("express");
const fs = require("fs");
const app = express.Router();

// Game guide
app.get("/webkit/guide", (req, res) => {
    if (fs.existsSync("./data/gameguide/index.html")) res.type("html").send(fs.readFileSync("./data/gameguide/index.html").toString());
    else res.type("html").send("<p>NFS World Offline by Lawin</p>");
});

module.exports = app;