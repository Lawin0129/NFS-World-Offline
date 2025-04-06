const express = require("express");
const app = express.Router();
const path = require("path");
const catalogManager = require("../services/catalogManager");

// Get catalog by category name
app.get("/catalog/*", (req, res) => {
    let catalogCategory = `${path.basename(req.path)}_${req.query.categoryName}`;
    let getCategory = catalogManager.getCategory(catalogCategory);

    res.xml(getCategory.success ? getCategory.data.categoryData : "<ArrayOfProductTrans/>");
});

module.exports = app;
