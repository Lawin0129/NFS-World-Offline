const express = require("express");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const app = express.Router();
const xml2js = require("xml2js");
const parser = new xml2js.Parser();
const builder = new xml2js.Builder({ renderOpts: { pretty: false }, headless: true });

// Get session info
app.post("/User/GetPermanentSession", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    global.activeDriver = { driver: "", personaId: "" };

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let DefaultPersonaIdx = fs.readFileSync("./drivers/DefaultPersonaIdx.xml").toString();
    parser.parseString(DefaultPersonaIdx, (err, result) => DefaultPersonaIdx = result);

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

    fs.readdirSync(driversDir).forEach(file => {
        if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", "")) && drivers < 3) {
            if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) return;

            let PersonaInfo = fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString();
            parser.parseString(PersonaInfo, (err, result) => PersonaInfo = result);
            
            delete PersonaInfo.ProfileData.Badges;

            SessionTemplate.UserInfo.personas[0].ProfileData.push(PersonaInfo.ProfileData);

            drivers += 1;
        }
    })

    res.status(200).send(builder.buildObject(SessionTemplate));
});

// Login to driver (Enter world)
app.post("/User/SecureLoginPersona", (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");

    let dirFiles = fs.readdirSync(driversDir);

    let drivers = 0;

    for (let file of dirFiles) {
        if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", "")) && drivers < 3) {
            if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) return;

            let PersonaInfo = fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString();
            parser.parseString(PersonaInfo, (err, result) => PersonaInfo = result);

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