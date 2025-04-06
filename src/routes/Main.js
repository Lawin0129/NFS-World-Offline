const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");

// Get xml file from data folder
app.use((req, res) => {
    let filePath = path.join(paths.dataPath, `${req.path.replace(/\.\./ig, "")}.xml`);

    if (fs.existsSync(filePath)) {
        res.xml(fs.readFileSync(filePath).toString());
    } else {
        res.status(204).end();
    }
});

module.exports = app;
