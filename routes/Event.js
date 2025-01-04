const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const personaManager = require("../services/personaManager");

let eventId = "";

// Launch single player event
app.get("/matchmaking/launchevent/:eventId", compression({ threshold: 0 }), (req, res) => {
    if (eventId.length == 0) eventId = req.params.eventId;

    let eventTemplate = {
        SessionInfo: {
            EventId: [eventId],
            SessionId: ["1"]
        }
    }

    res.type("application/xml").send(xmlParser.buildXML(eventTemplate));

    eventId = "";
});

// Multiplayer and Private event
app.put("/matchmaking/*/:eventId", compression({ threshold: 0 }), (req, res) => {
    eventId = req.params.eventId;

    console.log(`\nMultiplayer/private event detected (eventId: ${req.params.eventId}), launch any single player event to play this.`);

    res.type("application/xml").status(200).end();
});

// Busted in pursuit
app.post("/event/bust", compression({ threshold: 0 }), async (req, res) => {
    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    let carslotsPath = path.join(activePersona.data.driverDirectory, "carslots.xml");
    let carslots = await xmlParser.parseXML(fs.readFileSync(carslotsPath).toString());

    let defaultIdx = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let defaultCar = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx];

    let calculateDurability = Number(defaultCar.Durability[0]) - 5;
    if (calculateDurability < 0) calculateDurability = 0;
    
    defaultCar.Heat = ["1.0"];
    defaultCar.Durability = [`${calculateDurability}`];
    
    fs.writeFileSync(carslotsPath, xmlParser.buildXML(carslots));

    let finishTemplate = {
        PursuitEventResult: {
            Accolades: [{ HasLeveledUp: ["false"] }],
            Durability: defaultCar.Durability,
            EventSessionId: [req.query.eventSessionId],
            ExitPath: ["ExitToFreeroam"],
            InviteLifetimeInMilliseconds: ["0"],
            LobbyInviteId: ["0"],
            PersonaId: [activePersona.data.personaId],
            Heat: defaultCar.Heat
        }
    }

    res.type("application/xml").send(xmlParser.buildXML(finishTemplate));
});

// Finish event
app.post("/event/:eventAction", compression({ threshold: 0 }), async (req, res) => {
    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    let carslotsPath = path.join(activePersona.data.driverDirectory, "carslots.xml");
    let carslots = await xmlParser.parseXML(fs.readFileSync(carslotsPath).toString());

    let body = await xmlParser.parseXML(req.body);
    let bodyRootName = xmlParser.getRootName(body);
    if (!bodyRootName) return res.status(403).end();

    let event = `${bodyRootName.split("Arbitration")[0]}`;

    let defaultIdx = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let defaultCar = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx];

    body = body[bodyRootName];

    if (body.Heat) defaultCar.Heat = [body.Heat[0]];

    let calculateDurability = Number(defaultCar.Durability[0]);
    if ((event == "Pursuit") || (event == "Route") || (event == "TeamEscape")) calculateDurability -= 5;
    else if (event == "Drag") calculateDurability -= 2;

    if (calculateDurability < 0) calculateDurability = 0;

    defaultCar.Durability = [`${calculateDurability}`];

    fs.writeFileSync(carslotsPath, xmlParser.buildXML(carslots));

    let finishTemplate = {
        [`${event}EventResult`]: {
            Accolades: [{ HasLeveledUp: ["false"] }],
            Durability: defaultCar.Durability,
            EventSessionId: [req.query.eventSessionId],
            ExitPath: ["ExitToFreeroam"],
            InviteLifetimeInMilliseconds: ["0"],
            LobbyInviteId: ["0"],
            PersonaId: [activePersona.data.personaId],
            Heat: defaultCar.Heat,
            Entrants: [{
                RouteEntrantResult: [{
                    EventDurationInMilliseconds: body.EventDurationInMilliseconds,
                    EventSessionId: [req.query.eventSessionId],
                    FinishReason: body.FinishReason,
                    PersonaId: [activePersona.data.personaId],
                    Ranking: body.Rank,
                    BestLapDurationInMilliseconds: body.BestLapDurationInMilliseconds,
                    TopSpeed: body.TopSpeed
                }]
            }]
        }
    }

    res.type("application/xml").send(xmlParser.buildXML(finishTemplate));
});

module.exports = app;