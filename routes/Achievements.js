const express = require("express");
const compression = require("compression");
const fs = require("fs");
const xml2js = require("xml2js");
const parser = new xml2js.Parser();
const builder = new xml2js.Builder({ renderOpts: { pretty: false }, headless: true });
const app = express.Router();

// Get achievements from persona
app.get("/achievements/loadall", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let file = `./drivers/${global.activeDriver.driver}/loadall.xml`;

    if (!global.activeDriver.driver) return res.status(404).send("<EngineError><Message>No active persona</Message></EngineError>");

    if (fs.existsSync(file)) res.send(fs.readFileSync(file).toString());
    else res.status(200).end();
});

// Set achievement badges
app.put("/badges/set", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let file = `./drivers/${global.activeDriver.driver}/GetPersonaInfo.xml`;
    let achievementFile = `./drivers/${global.activeDriver.driver}/loadall.xml`;

    let badgesTemplate = {
        Badges: [{ BadgePacket: [] }]
    }

    if (!global.activeDriver.driver) return res.status(404).send("<EngineError><Message>No active persona</Message></EngineError>");
    if (!fs.existsSync(achievementFile)) return res.status(404).send("<EngineError><Message>No achievements file found in persona</Message></EngineError>");

    let PersonaInfo = fs.readFileSync(file).toString();
    let Achievements = fs.readFileSync(achievementFile).toString();
    let body = req.body;
    parser.parseString(body, (err, result) => body = result);
    parser.parseString(PersonaInfo, (err, result) => PersonaInfo = result);
    parser.parseString(Achievements, (err, result) => Achievements = result);

    for (let i in body.BadgeBundle.Badges[0].BadgeInput) {
        let badge = Achievements.AchievementsPacket.Definitions[0].AchievementDefinitionPacket.find(x => x.BadgeDefinitionId[0] == body.BadgeBundle.Badges[0].BadgeInput[i].BadgeDefinitionId[0]);
        let achRankslen = badge.AchievementRanks[0].AchievementRankPacket[badge.AchievementRanks[0].AchievementRankPacket.length - 1];

        badgesTemplate.Badges[0].BadgePacket.push({
            AchievementRankId: achRankslen.AchievementRankId,
            BadgeDefinitionId: badge.BadgeDefinitionId,
            IsRare: achRankslen.IsRare,
            Rarity: achRankslen.Rarity,
            SlotId: body.BadgeBundle.Badges[0].BadgeInput[i].SlotId
        })
    }

    PersonaInfo.ProfileData.Badges = badgesTemplate.Badges;

    fs.writeFileSync(file, builder.buildObject(PersonaInfo));
    
    res.status(200).end();
});

module.exports = app;