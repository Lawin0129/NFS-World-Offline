const express = require("express");
const app = express.Router();
const xmlParser = require("../utils/xmlParser");
const personaManager = require("../services/personaManager");

// Start session
app.post("/User/GetPermanentSession", async (req, res) => {
    personaManager.removeActivePersona();
    
    let DefaultPersonaIdx = (await personaManager.getDefaultPersonaIdx()).data;

    let SessionTemplate = {
        UserInfo: {
            defaultPersonaIdx: [DefaultPersonaIdx ?? "0"],
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
    };

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
        res.status(setActivePersona.error.status).send(setActivePersona.error.reason);
    }
});

// Log out of driver (game close/changing driver)
app.post("/User/SecureLogout*", (req, res) => {
    personaManager.removeActivePersona();

    res.type("application/xml").status(200).end();
});

module.exports = app;