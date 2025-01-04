const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const personaManager = require("../services/personaManager");

// Get achievements from persona
app.get("/achievements/loadall", compression({ threshold: 0 }), (req, res) => {
    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    let achievementsPath = path.join(activePersona.data.driverDirectory, "loadall.xml");

    res.type("application/xml");

    if (fs.existsSync(achievementsPath)) {
        res.send(fs.readFileSync(achievementsPath).toString());
    } else {
        res.status(404).end();
    }
});

// Set achievement badges
app.put("/badges/set", compression({ threshold: 0 }), async (req, res) => {
    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    let personaInfoPath = path.join(activePersona.data.driverDirectory, "GetPersonaInfo.xml");
    let achievementsPath = path.join(activePersona.data.driverDirectory, "loadall.xml");

    if (!fs.existsSync(personaInfoPath)) return res.status(404).end();
    if (!fs.existsSync(achievementsPath)) return res.status(404).end();

    let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(personaInfoPath).toString());
    let Achievements = await xmlParser.parseXML(fs.readFileSync(achievementsPath).toString());
    let body = await xmlParser.parseXML(req.body);

    let badgesTemplate = {
        Badges: [{ BadgePacket: [] }]
    }

    let bodyBadges = body.BadgeBundle.Badges[0].BadgeInput;

    for (let i in bodyBadges) {
        let badge = Achievements.AchievementsPacket.Definitions[0].AchievementDefinitionPacket.find(x => x.BadgeDefinitionId[0] == bodyBadges[i].BadgeDefinitionId[0]);
        let achRankslen = badge.AchievementRanks[0].AchievementRankPacket[badge.AchievementRanks[0].AchievementRankPacket.length - 1];

        badgesTemplate.Badges[0].BadgePacket.push({
            AchievementRankId: achRankslen.AchievementRankId,
            BadgeDefinitionId: badge.BadgeDefinitionId,
            IsRare: achRankslen.IsRare,
            Rarity: achRankslen.Rarity,
            SlotId: bodyBadges[i].SlotId
        });
    }

    PersonaInfo.ProfileData.Badges = badgesTemplate.Badges;

    fs.writeFileSync(personaInfoPath, xmlParser.buildXML(PersonaInfo));
    
    res.type("application/xml").status(200).end();
});

module.exports = app;