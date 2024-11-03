const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xmlParser = require("../structs/xmlParser");

// Get session info
app.post("/User/GetPermanentSession", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    global.activeDriver = { driver: "", personaId: "" };

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let DefaultPersonaIdx = await xmlParser.parseXML(fs.readFileSync("./drivers/DefaultPersonaIdx.xml").toString());

    let SessionTemplate = {
        UserInfo: {
            defaultPersonaIdx: DefaultPersonaIdx.UserInfo.defaultPersonaIdx,
            personas: [{ ProfileData: [] }],
            user: [{
                fullGameAccess: ["false"],
                isComplete: ["false"],
                remoteUserId: ["0"],
                subscribeMsg: ["false"],
                securityToken: ["b"],
                userId: ["1"]
            }]
        }
    }

    for (let file of fs.readdirSync(driversDir)) {
        if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", "")) && drivers < 3) {
            if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) return;

            let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());
            
            delete PersonaInfo.ProfileData.Badges;

            SessionTemplate.UserInfo.personas[0].ProfileData.push(PersonaInfo.ProfileData);

            drivers += 1;
        }
    }

    res.status(200).send(xmlParser.buildXML(SessionTemplate));
});

// Login to driver (Enter world)
app.post("/User/SecureLoginPersona", async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");

    let dirFiles = fs.readdirSync(driversDir);

    let drivers = 0;

    for (let file of dirFiles) {
        if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", "")) && drivers < 3) {
            if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) return;

            let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

            if (PersonaInfo.ProfileData.PersonaId[0] == req.query.personaId) {
                global.activeDriver = { driver: file, personaId: PersonaInfo.ProfileData.PersonaId[0] };

                fs.writeFileSync("./drivers/DefaultPersonaIdx.xml", `<UserInfo><defaultPersonaIdx>${drivers}</defaultPersonaIdx></UserInfo>`);

                return res.status(200).end();
            }

            drivers += 1;
        }
    }

    res.status(404).end();
});

// Log out of driver (game close/changing driver)
app.post("/User/SecureLogout*", (req, res) => {
    res.type("application/xml");

    global.activeDriver = { driver: "", personaId: "" };

    res.status(200).end();
});

module.exports = app;