const express = require("express");
const compression = require("compression");
const fs = require("fs");
const xml2js = require("xml2js");
const parser = new xml2js.Parser();
const builder = new xml2js.Builder({ renderOpts: { pretty: false }, headless: true });
const app = express.Router();

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

    res.status(200).send(builder.buildObject(eventTemplate));
});

// Multiplayer and Private event
app.put("/matchmaking/*/:eventId", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    eventId = req.params.eventId;

    console.log(`\nMultiplayer/private event detected (eventId: ${req.params.eventId}), launch a single player event to launch this event.\n`);

    res.status(200).end();
});

// Finish event
app.post("/event/arbitration", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let file = `./drivers/${global.activeDriver.driver}/carslots.xml`;

    if (!global.activeDriver.driver) return res.status(404).send("<EngineError><Message>No active persona</Message></EngineError>");

    let carslots = fs.readFileSync(file).toString();
    let body = req.body;

    parser.parseString(carslots, (err, result) => carslots = result);
    parser.parseString(body, (err, result) => body = result);

    let bodyStanza;
    for (let i in body) bodyStanza = i;

    if (!bodyStanza) return res.status(403).end();

    let defaultIdx = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let calculateHeat = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Heat[0];
    let durability = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability[0];

    if (body[bodyStanza].Heat) calculateHeat = body[bodyStanza].Heat[0];
    
    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Heat = [calculateHeat];

    let calculateDurability = Number(durability);

    if (bodyStanza == "PursuitArbitrationPacket" || bodyStanza == "RouteArbitrationPacket") calculateDurability -= 5;
    if (bodyStanza == "DragArbitrationPacket") calculateDurability -= 2;

    if (calculateDurability < 0) calculateDurability = 0;

    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability = [`${calculateDurability}`];

    fs.writeFileSync(file, builder.buildObject(carslots));

    let respStanza;
    if (bodyStanza == "PursuitArbitrationPacket") respStanza = "PursuitEventResult";
    if (bodyStanza == "RouteArbitrationPacket") respStanza = "RouteEventResult";
    if (bodyStanza == "DragArbitrationPacket") respStanza = "DragEventResult";

    if (!respStanza) return res.status(403).end();

    let finishTemplate = {
        [respStanza]: {
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

    res.status(200).send(builder.buildObject(finishTemplate));
});

// Busted in pursuit
app.post("/event/bust", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let file = `./drivers/${global.activeDriver.driver}/carslots.xml`;

    if (!global.activeDriver.driver) return res.status(404).send("<EngineError><Message>No active persona</Message></EngineError>");

    let carslots = fs.readFileSync(file).toString();
    parser.parseString(carslots, (err, result) => carslots = result);

    let defaultIdx = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let durability = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability[0];
    
    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Heat = ["1.0"];
    
    let calculateDurability = Number(durability) - 5;
    if (calculateDurability < 0) calculateDurability = 0;

    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx].Durability = [`${calculateDurability}`];

    fs.writeFileSync(file, builder.buildObject(carslots));

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

    res.status(200).send(builder.buildObject(finishTemplate));
});

module.exports = app;