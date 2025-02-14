const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const log = require("../utils/log");
const personaManager = require("../services/personaManager");
const carManager = require("../services/carManager");

let eventId = "";

// Launch single player event
app.get("/matchmaking/launchevent/:eventId", compression({ threshold: 0 }), (req, res) => {
    if (eventId.length == 0) eventId = req.params.eventId;
    else {
        log.game(`Launching the detected multiplayer event (eventId: ${eventId}).`)
    }

    let eventTemplate = {
        SessionInfo: {
            EventId: [eventId],
            SessionId: ["1"]
        }
    }

    res.type("application/xml").send(xmlParser.buildXML(eventTemplate));

    eventId = "";
});

// Multiplayer event
app.put("/matchmaking/joinqueueevent/:eventId", compression({ threshold: 0 }), (req, res) => {
    eventId = req.params.eventId;

    log.game(`Multiplayer event detected (eventId: ${eventId}), launch any single player event to play this.`);

    res.type("application/xml").status(200).end();
});

// Create private lobby
app.put("/matchmaking/makeprivatelobby/:eventId", compression({ threshold: 0 }), async (req, res) => {
    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    const findPersona = await personaManager.getPersonaById(activePersona.data.personaId);
    if (!findPersona.success) return res.status(404).end();
    
    let makeLobbyTemplate = {
        LobbyInfo: {
            Entrants: [{
                LobbyEntrantInfo: [{
                    GridIndex: ["0"],
                    Heat: ["0.0"],
                    Level: findPersona.data.personaInfo.Level,
                    PersonaId: findPersona.data.personaInfo.PersonaId,
                    State: ["InFreeRoam"],
                    Ready: ["false"]
                }]
            }],
            EventId: [req.params.eventId],
            IsInviteEnabled: ["true"],
            LobbyId: ["1"],
            LobbyInviteId: [req.params.eventId]
        }
    }

    res.type("application/xml").send(xmlParser.buildXML(makeLobbyTemplate));
});

// Accept invite
app.put("/matchmaking/acceptinvite", compression({ threshold: 0 }), async (req, res) => {
    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    const findPersona = await personaManager.getPersonaById(activePersona.data.personaId);
    if (!findPersona.success) return res.status(404).end();

    let lobbyEventID = ((typeof req.query.lobbyInviteId) == "string") ? req.query.lobbyInviteId : "";

    let acceptInviteTemplate = {
        LobbyInfo: {
            Countdown: [{
                EventId: [lobbyEventID],
                IsWaiting: ["false"],
                LobbyCountdownInMilliseconds: ["60000"],
                LobbyId: ["1"],
                LobbyStuckDurationInMilliseconds: ["10000"]
            }],
            Entrants: [{
                LobbyEntrantInfo: [{
                    GridIndex: ["0"],
                    Heat: ["0.0"],
                    Level: findPersona.data.personaInfo.Level,
                    PersonaId: findPersona.data.personaInfo.PersonaId,
                    State: ["InLobby"],
                    Ready: ["false"]
                }]
            }],
            EventId: [lobbyEventID],
            IsInviteEnabled: ["true"],
            LobbyId: ["1"],
            LobbyInviteId: [lobbyEventID]
        }
    }

    res.type("application/xml").send(xmlParser.buildXML(acceptInviteTemplate));
});

// Busted in pursuit
app.post("/event/bust", compression({ threshold: 0 }), async (req, res) => {
    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    const getCarslots = await carManager.getCarslots(activePersona.data.personaId);
    if (!getCarslots.success) return res.status(404).end();

    let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);

    let defaultIdx = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let defaultCar = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx];

    let calculateDurability = Number(defaultCar.Durability[0]) - 5;
    if (calculateDurability < 0) calculateDurability = 0;
    
    defaultCar.Heat = ["1.0"];
    defaultCar.Durability = [`${calculateDurability}`];
    
    fs.writeFileSync(getCarslots.data.carslotsPath, xmlParser.buildXML(parsedCarslots));

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

    const getCarslots = await carManager.getCarslots(activePersona.data.personaId);
    if (!getCarslots.success) return res.status(404).end();

    let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);

    let body = await xmlParser.parseXML(req.body);
    let bodyRootName = xmlParser.getRootName(body);
    if (!bodyRootName) return res.status(403).end();

    let event = `${bodyRootName.split("Arbitration")[0]}`;

    let defaultIdx = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let defaultCar = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx];

    body = body[bodyRootName];

    if (body.Heat) defaultCar.Heat = [body.Heat[0]];

    let calculateDurability = Number(defaultCar.Durability[0]);
    if ((event == "Pursuit") || (event == "Route") || (event == "TeamEscape")) calculateDurability -= 5;
    else if (event == "Drag") calculateDurability -= 2;

    if (calculateDurability < 0) calculateDurability = 0;

    defaultCar.Durability = [`${calculateDurability}`];

    fs.writeFileSync(getCarslots.data.carslotsPath, xmlParser.buildXML(parsedCarslots));

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