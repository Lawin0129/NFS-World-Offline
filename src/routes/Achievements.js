const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const personaManager = require("../services/personaManager");

// Get achievements from persona
app.get("/achievements/loadall", (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    let achievementsPath = path.join(getActivePersona.data.driverDirectory, "loadall.xml");

    if (fs.existsSync(achievementsPath)) {
        res.xml(fs.readFileSync(achievementsPath).toString());
    } else {
        res.status(404).end();
    }
});

// Set achievement badges
app.put("/badges/set", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    let personaInfoPath = path.join(getActivePersona.data.driverDirectory, "GetPersonaInfo.xml");
    let achievementsPath = path.join(getActivePersona.data.driverDirectory, "loadall.xml");

    if (!fs.existsSync(personaInfoPath)) return res.status(404).end();
    if (!fs.existsSync(achievementsPath)) return res.status(404).end();

    let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(personaInfoPath).toString());
    let Achievements = await xmlParser.parseXML(fs.readFileSync(achievementsPath).toString());
    let parsedBody = await xmlParser.parseXML(req.body);

    let badgesTemplate = {
        Badges: [{ BadgePacket: [] }]
    };

    let badgeInputs = parsedBody?.BadgeBundle?.Badges?.[0]?.BadgeInput;
    if (!Array.isArray(badgeInputs)) return res.status(403).end();

    for (let badgeInput of badgeInputs) {
        let slotId = badgeInput?.SlotId?.[0];
        if ((typeof slotId) != "string") continue;
        if (/^[0123]$/.test(slotId) == false) continue;
        if (badgesTemplate.Badges[0].BadgePacket.some(pkt => pkt.SlotId[0] == slotId)) continue;

        let badge = Achievements.AchievementsPacket.Definitions[0].AchievementDefinitionPacket.find(x => x.BadgeDefinitionId[0] == badgeInput?.BadgeDefinitionId?.[0]);
        if (!badge) continue;
        
        let achievementPackets = badge.AchievementRanks[0].AchievementRankPacket;
        let targetAchievementPacket = achievementPackets.pop();
        if (!targetAchievementPacket) continue;
        
        badgesTemplate.Badges[0].BadgePacket.push({
            AchievementRankId: targetAchievementPacket.AchievementRankId,
            BadgeDefinitionId: badge.BadgeDefinitionId,
            IsRare: targetAchievementPacket.IsRare,
            Rarity: targetAchievementPacket.Rarity,
            SlotId: [slotId]
        });
    }

    PersonaInfo.ProfileData.Badges = badgesTemplate.Badges;

    fs.writeFileSync(personaInfoPath, xmlParser.buildXML(PersonaInfo, { pretty: true }));
    
    res.status(200).end();
});

module.exports = app;
