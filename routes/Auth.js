const express = require("express");
const app = express.Router();

// Soapbox login (no modernAuth)
app.get("/User/authenticateUser", (req, res) => {
    res.type("application/xml");

    res.send("<LoginStatusVO><UserId>1</UserId><LoginToken>a</LoginToken><Description/></LoginStatusVO>");
});

// Soapbox login (with modernAuth)
app.post("/User/modernAuth", (req, res) => {
    res.json({ token: "a", userId: 1 });
});

module.exports = app;