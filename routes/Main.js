const express = require("express");
const compression = require("compression");
const fs = require("fs");
const app = express.Router();

// Get xml file from data folder
app.use(compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let filePath = `./data${req.path}.xml`;

    if (fs.existsSync(filePath)) {
        return res.send(fs.readFileSync(filePath).toString());
    } else {
        res.status(204).end();
    }
});

module.exports = app;