const express = require("express");
const app = express.Router();
const compression = require("compression");
const path = require("path");
const catalogManager = require("../services/catalogManager");

// Get catalog by category name
app.get("/catalog/*", compression({ threshold: 0 }), (req, res) => {
    let catalogCategory = `${path.basename(req.path)}_${req.query.categoryName}`;
    let getCategory = catalogManager.getCategory(catalogCategory);

    res.type("application/xml").send(getCategory.success ? getCategory.data.categoryData : "<ArrayOfProductTrans/>");
});

module.exports = app;