const express = require("express");
const app = express.Router();
const fs = require("fs");
const xmlParser = require("../utils/xmlParser");
const log = require("../utils/log");
const personaManager = require("../services/personaManager");
const carManager = require("../services/carManager");
const functions = require("../utils/functions");
const allEvents = require("../../config/Assets/events.json");
const allEventRewards = require("../../config/Assets/event_rewards.json");
const eventManager = require("../services/eventManager");

let eventId = "";

// Launch single player event
app.get("/matchmaking/launchevent/:eventId", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    if (eventId.length == 0) eventId = req.params.eventId;
    else {
        log.game(`Launching the detected multiplayer event (eventId: ${eventId}).`)
    }

    const createEvent = await eventManager.createSinglePlayerEvent(getActivePersona.data.personaId, eventId);
    if (!createEvent.success) return res.status(createEvent.error.status).send(createEvent.error.reason);

    let eventTemplate = {
        SessionInfo: {
            EventId: [createEvent.data.eventSession.eventId],
            SessionId: [createEvent.data.sessionId]
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

// Finish event
app.post("/event/:eventAction", async (req, res) => {
    const getActivePersona = personaManager.getActivePersona();
    if (!getActivePersona.success) return res.status(getActivePersona.error.status).send(getActivePersona.error.reason);

    let eventSessionId = ((typeof req.query.eventSessionId) == "string") ? req.query.eventSessionId : "";

    const eventFinish = await eventManager.finishEvent(getActivePersona.data.personaId, eventSessionId, req.body, req.params.eventAction);
    if (!eventFinish.success) return res.status(eventFinish.error.status).send(eventFinish.error.reason);

    res.xml(eventFinish.data);
});

module.exports = app;
