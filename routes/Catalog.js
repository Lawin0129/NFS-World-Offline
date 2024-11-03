const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");

// Get catalog by category name
app.get("/catalog/*", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let categoryPath = `./data${req.path}_${req.query.categoryName}.xml`;

    if (fs.existsSync(categoryPath)) {
        return res.send(fs.readFileSync(categoryPath).toString());
    }

    res.status(200).send("<ArrayOfProductTrans/>");
});

module.exports = app;