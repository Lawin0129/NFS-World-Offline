const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");

// Get friends list
app.get("/getfriendlistfromuserid", compression({ threshold: 0 }), async (req, res, next) => {
    if (fs.existsSync("./data/getfriendlistfromuserid.xml")) return next();

    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

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

    let dirFiles = fs.readdirSync(driversDir);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                friendsTemplate.PersonaFriendsList.friendPersona[0].FriendPersona.push({
                    iconIndex: PersonaInfo.ProfileData.IconIndex,
                    level: PersonaInfo.ProfileData.Level,
                    name: PersonaInfo.ProfileData.Name,
                    originalName: ["test"],
                    personaId: PersonaInfo.ProfileData.PersonaId,
                    presence: ["0"],
                    socialNetwork: ["0"],
                    userId: ["1"]
                });

                drivers += 1;
            }
        }
    }

    res.status(200).send(xmlParser.buildXML(friendsTemplate));
});

module.exports = app;