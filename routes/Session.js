const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const personaManager = require("../services/personaManager");

// Get session info
app.post("/User/GetPermanentSession", compression({ threshold: 0 }), async (req, res) => {
    personaManager.removeActivePersona();
    
    let DefaultPersonaIdx = await xmlParser.parseXML(fs.readFileSync(path.join(__dirname, "..", "drivers", "DefaultPersonaIdx.xml")).toString());

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

    const allPersonas = await personaManager.getPersonas();

    for (let personaData of allPersonas) {
        delete personaData.personaInfo.Badges;
        
        SessionTemplate.UserInfo.personas[0].ProfileData.push(personaData.personaInfo);
    }

    res.type("application/xml").send(xmlParser.buildXML(SessionTemplate));
});

// Login to driver (Enter world)
app.post("/User/SecureLoginPersona", async (req, res) => {
    res.type("application/xml");

    const setActivePersona = await personaManager.setActivePersona(req.query.personaId);

    if (setActivePersona.success) {
        res.status(200).end();
    } else {
        res.status(404).end();
    }
});

// Log out of driver (game close/changing driver)
app.post("/User/SecureLogout*", (req, res) => {
    res.type("application/xml");

    personaManager.removeActivePersona();

    res.status(200).end();
});

module.exports = app;