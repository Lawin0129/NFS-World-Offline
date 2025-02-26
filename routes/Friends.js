const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const xmlParser = require("../utils/xmlParser");

// Get friends list
app.get("/getfriendlistfromuserid", async (req, res, next) => {
    if (fs.existsSync(path.join(paths.dataPath, "getfriendlistfromuserid.xml"))) return next();
    
    let friendsTemplate = {
        PersonaFriendsList: {
            friendPersona: [{
                FriendPersona: [{
                    iconIndex: ["8"],
                    level: ["60"],
                    name: ["LAWIN"],
                    originalName: ["test"],
                    personaId: ["0"],
                    presence: ["2"],
                    socialNetwork: ["0"],
                    userId: ["0"]
                }]
            }]
        }
    }

    res.type("application/xml").send(xmlParser.buildXML(friendsTemplate));
});

module.exports = app;