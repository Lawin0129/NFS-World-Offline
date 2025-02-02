const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");

// Get catalog by category name
app.get("/catalog/*", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let catalogCategory = `${path.basename(req.path)}_${req.query.categoryName?.replace?.(/\.\./ig, "")}.xml`;
    let categoryPath = path.join(paths.dataPath, "catalog", catalogCategory);

    if (fs.existsSync(categoryPath)) {
        res.send(fs.readFileSync(categoryPath).toString());
    } else {
        res.status(200).send("<ArrayOfProductTrans/>");
    }
});

module.exports = app;