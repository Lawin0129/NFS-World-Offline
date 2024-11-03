const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const xmlParser = require("../structs/xmlParser");

let eventId;

// Launch single player event
app.get("/matchmaking/launchevent/:eventId", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    if (!eventId) eventId = req.params.eventId;

    let eventTemplate = {
        SessionInfo: {
            EventId: [eventId],
            SessionId: ["1"]
        }
    }

    eventId = "";

    res.status(200).send(xmlParser.buildXML(eventTemplate));
});

// Multiplayer and Private event
app.put("/matchmaking/*/:eventId", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    eventId = req.params.eventId;

    console.log(`\nMultiplayer/private event detected (eventId: ${req.params.eventId}), launch a single player event to launch this event.`);

    res.status(200).end();
});

// Busted in pursuit
app.post("/event/bust", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let file = `./drivers/${global.activeDriver.driver}/carslots.xml`;

    if (!global.activeDriver.driver) return res.status(404).send("<EngineError><Message>No active persona</Message></EngineError>");

    let carslots = await xmlParser.parseXML(fs.readFileSync(file).toString());

    let defaultIdx = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let durability = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability[0];
    
    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Heat = ["1.0"];
    
    let calculateDurability = Number(durability) - 5;
    if (calculateDurability < 0) calculateDurability = 0;

    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability = [`${calculateDurability}`];

    fs.writeFileSync(file, xmlParser.buildXML(carslots));

    let finishTemplate = {
        PursuitEventResult: {
            Accolades: [{ HasLeveledUp: ["false"] }],
            Durability: carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability,
            EventSessionId: [req.query.eventSessionId],
            ExitPath: ["ExitToFreeroam"],
            InviteLifetimeInMilliseconds: ["0"],
            LobbyInviteId: ["0"],
            PersonaId: [global.activeDriver.personaId],
            Heat: carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Heat
        }
    }

    res.status(200).send(xmlParser.buildXML(finishTemplate));
});

// Finish event
app.post("/event/:eventAction", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let file = `./drivers/${global.activeDriver.driver}/carslots.xml`;

    if (!global.activeDriver.driver) return res.status(404).send("<EngineError><Message>No active persona</Message></EngineError>");

    let carslots = await xmlParser.parseXML(fs.readFileSync(file).toString());
    let body = await xmlParser.parseXML(req.body);

    let bodyStanza = xmlParser.getRootName(body);
    let event;

    if (!bodyStanza) return res.status(403).end();

    event = `${bodyStanza.split("Arbitration")[0]}`;

    let defaultIdx = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let calculateHeat = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Heat[0];
    let durability = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability[0];

    if (body[bodyStanza].Heat) calculateHeat = body[bodyStanza].Heat[0];
    
    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Heat = [calculateHeat];

    let calculateDurability = Number(durability);

    if (event == "Pursuit" || event == "Route" || event == "TeamEscape") calculateDurability -= 5;
    if (event == "Drag") calculateDurability -= 2;

    if (calculateDurability < 0) calculateDurability = 0;

    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability = [`${calculateDurability}`];

    fs.writeFileSync(file, xmlParser.buildXML(carslots));

    let finishTemplate = {
        [`${event}EventResult`]: {
            Accolades: [{ HasLeveledUp: ["false"] }],
            Durability: carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability,
            EventSessionId: [req.query.eventSessionId],
            ExitPath: ["ExitToFreeroam"],
            InviteLifetimeInMilliseconds: ["0"],
            LobbyInviteId: ["0"],
            PersonaId: [global.activeDriver.personaId],
            Heat: carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Heat,
            Entrants: [{
                RouteEntrantResult: [{
                    EventDurationInMilliseconds: body[bodyStanza].EventDurationInMilliseconds,
                    EventSessionId: [req.query.eventSessionId],
                    FinishReason: body[bodyStanza].FinishReason,
                    PersonaId: [global.activeDriver.personaId],
                    Ranking: body[bodyStanza].Rank,
                    BestLapDurationInMilliseconds: body[bodyStanza].BestLapDurationInMilliseconds,
                    TopSpeed: body[bodyStanza].TopSpeed
                }]
            }]
        }
    }

    res.status(200).send(xmlParser.buildXML(finishTemplate));
});

module.exports = app;