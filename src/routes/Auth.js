const express = require("express");
const app = express.Router();

// Soapbox login (no modernAuth)
app.get("/User/authenticateUser", (req, res) => {
    res.xml("<LoginStatusVO><UserId>1</UserId><LoginToken>a</LoginToken><Description/></LoginStatusVO>");
});

// Soapbox login (with modernAuth)
app.post("/User/modernAuth", (req, res) => {
    res.json({ token: "a", userId: 1 });
});

// Soapbox register (no modernAuth)
app.get("/User/createUser", (req, res) => {
    res.xml("<LoginStatusVO><UserId>1</UserId><LoginToken>a</LoginToken><Description/></LoginStatusVO>");
});

// Soapbox register (with modernAuth)
app.post("/User/modernRegister", (req, res) => {
    res.json({ message: "Account created! You can now log in." });
});

module.exports = app;
