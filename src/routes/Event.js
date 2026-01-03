const express = require("express");
const app = express.Router();
const fs = require("fs");
const xmlParser = require("../utils/xmlParser");
const log = require("../utils/log");
const personaManager = require("../services/personaManager");
const carManager = require("../services/carManager");

let eventId = "";

// Launch single player event
app.get("/matchmaking/launchevent/:eventId", (req, res) => {
    if (eventId.length == 0) eventId = req.params.eventId;
    else {
        log.game(`Launching the detected multiplayer event (eventId: ${eventId}).`)
    }

    let eventTemplate = {
        SessionInfo: {
            EventId: [eventId],
            SessionId: ["1"]
        }
    };

    res.xml(eventTemplate);

    eventId = "";
});

// Multiplayer event
app.put("/matchmaking/joinqueueevent/:eventId", (req, res) => {
    eventId = req.params.eventId;

    log.game(`Multiplayer event detected (eventId: ${eventId}), launch any single player event to play this.`);

    res.status(200).end();
});

// Create private lobby
app.put("/matchmaking/makeprivatelobby/:eventId", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    const findPersona = await personaManager.getPersonaById(getActivePersona.data.personaId);
    if (!findPersona.success) return res.status(findPersona.error.status).send(findPersona.error.reason);
    
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
    };

    res.xml(makeLobbyTemplate);
});

// Accept invite
app.put("/matchmaking/acceptinvite", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    const findPersona = await personaManager.getPersonaById(getActivePersona.data.personaId);
    if (!findPersona.success) return res.status(findPersona.error.status).send(findPersona.error.reason);

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
            IsInviteEnabled: ["false"],
            LobbyId: ["1"],
            LobbyInviteId: [lobbyEventID]
        }
    };

    res.xml(acceptInviteTemplate);
});

// Busted in pursuit
app.post("/event/bust", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    const getCarslots = await carManager.getCarslots(getActivePersona.data.personaId);
    if (!getCarslots.success) return res.status(getCarslots.error.status).send(getCarslots.error.reason);

    let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);

    let defaultIdx = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let defaultCar = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx];

    let calculateDurability = Number(defaultCar.Durability[0]) - 5;
    if (calculateDurability < 0) calculateDurability = 0;
    
    defaultCar.Heat = ["1.0"];
    defaultCar.Durability = [`${calculateDurability}`];
    
    fs.writeFileSync(getCarslots.data.carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));

    let eventSessionID = ((typeof req.query.eventSessionId) == "string") ? req.query.eventSessionId : "";

    let finishTemplate = {
        PursuitEventResult: {
            Accolades: [{ HasLeveledUp: ["false"] }],
            Durability: defaultCar.Durability,
            EventSessionId: [eventSessionID],
            ExitPath: ["ExitToFreeroam"],
            InviteLifetimeInMilliseconds: ["0"],
            LobbyInviteId: ["0"],
            PersonaId: [getActivePersona.data.personaId],
            Heat: defaultCar.Heat
        }
    };

    res.xml(finishTemplate);
});

// Finish event
app.post("/event/:eventAction", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    const getCarslots = await carManager.getCarslots(getActivePersona.data.personaId);
    if (!getCarslots.success) return res.status(getCarslots.error.status).send(getCarslots.error.reason);

    let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);

    let body = await xmlParser.parseXML(req.body);
    let bodyRootName = xmlParser.getRootName(body);
    if (!bodyRootName) return res.status(403).end();

    let event = `${bodyRootName.split("Arbitration")[0]}`;

    let defaultIdx = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
    let defaultCar = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx];

    body = body[bodyRootName];

    if (body.Heat) {
        let parsedHeat = parseFloat(body.Heat[0]);

        if (parsedHeat >= 1){
            if (parsedHeat > 5) parsedHeat = 5;

            defaultCar.Heat = [`${parsedHeat}`];
        }
    }

    let calculateDurability = Number(defaultCar.Durability[0]);
    if ((event == "Pursuit") || (event == "Route") || (event == "TeamEscape")) calculateDurability -= 5;
    else if (event == "Drag") calculateDurability -= 2;

    if (calculateDurability < 0) calculateDurability = 0;

    defaultCar.Durability = [`${calculateDurability}`];

    fs.writeFileSync(getCarslots.data.carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));

    let eventSessionID = ((typeof req.query.eventSessionId) == "string") ? req.query.eventSessionId : "";

    let finishTemplate = {
        [`${event}EventResult`]: {
            Accolades: [{ HasLeveledUp: ["false"] }],
            Durability: defaultCar.Durability,
            EventSessionId: [eventSessionID],
            ExitPath: ["ExitToFreeroam"],
            InviteLifetimeInMilliseconds: ["0"],
            LobbyInviteId: ["0"],
            PersonaId: [getActivePersona.data.personaId],
            Heat: defaultCar.Heat,
            Entrants: [{
                RouteEntrantResult: [{
                    EventDurationInMilliseconds: body.EventDurationInMilliseconds,
                    EventSessionId: [eventSessionID],
                    FinishReason: body.FinishReason,
                    PersonaId: [getActivePersona.data.personaId],
                    Ranking: body.Rank,
                    BestLapDurationInMilliseconds: body.BestLapDurationInMilliseconds,
                    TopSpeed: body.TopSpeed
                }]
            }]
        }
    };

    res.xml(finishTemplate);
});

module.exports = app;
