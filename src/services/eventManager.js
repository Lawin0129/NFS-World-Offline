const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const response = require("../utils/response");
const error = require("../utils/error");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const personaManager = require("../services/personaManager");
const carManager = require("../services/carManager");
const inventoryManager = require("./inventoryManager");
const rewardManager = require("../services/rewardManager");
const allEvents = require("../../config/Assets/events.json");
const allEventRewards = require("../../config/Assets/event_rewards.json");

let eventSessions = {};

let self = module.exports = {
    createSinglePlayerEvent: async (personaId, eventId) => {
        const findPersona = await personaManager.getPersonaById(personaId);
        if (!findPersona.success) return findPersona;

        let eventSessionId = functions.MakeID();
        
        while (eventSessions[eventSessionId]) {
            eventSessionId = functions.MakeID();
        }

        let personaLevel = parseInt(findPersona.data.personaInfo.Level?.[0]) || 1;
        if (personaLevel <= 0) personaLevel = 1;
    
        eventSessions[eventSessionId] = {
            eventId: eventId,
            players: [{
                personaId: personaId,
                level: personaLevel,
                finished: false
            }],
            type: "singleplayer"
        };

        return response.createSuccess({
            sessionId: eventSessionId,
            eventSession: eventSessions[eventSessionId]
        });
    },
    finishEvent: async (personaId, eventSessionId, arbitrationBody, eventAction) => {
        let eventObject = eventSessions[eventSessionId];
        if (!eventObject) return error.eventNotFound();
    
        let playerObject = eventObject.players.find(p => p.personaId == personaId);
        if (!playerObject) return error.eventNonParticipant();
        if (playerObject.finished) return error.eventPlayerAlreadyFinished();
    
        const getCarslots = await carManager.getCarslots(personaId);
        if (!getCarslots.success) return getCarslots;
    
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
    
        let defaultIdx = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex?.[0];
        let defaultCar = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona?.[0]?.OwnedCarTrans?.[defaultIdx];
    
        if (!defaultCar) return error.carNotFound();
    
        let body = await xmlParser.parseXML(arbitrationBody);
        let bodyRootName = xmlParser.getRootName(body);
        if (!bodyRootName) return error.badRequestBody();
    
        body = body[bodyRootName];
    
        let event = `${bodyRootName.split("Arbitration")[0]}`;
        let accolades = [];
    
        switch (eventAction) {
            case "bust": {
                if (bodyRootName != "PursuitArbitrationPacket") return error.badRequestBody();
    
                playerObject.finished = true;
    
                let calculateDurability = parseInt(defaultCar.Durability[0]) - 5;
                if (calculateDurability < 0) calculateDurability = 0;
    
                defaultCar.Heat = ["1.0"];
                defaultCar.Durability = [`${calculateDurability}`];
                break;
            }
    
            case "arbitration": {
                playerObject.finished = true;

                const finishReason = parseInt(body.FinishReason?.[0]);
    
                const eventData = allEvents.find(e => e.ID == eventObject.eventId);
                let eventRewards;
    
                if (eventData) {
                    eventRewards = allEventRewards.find(r => r.ID == eventData[`${eventObject.type}_reward_config_id`]);
                }
    
                if (eventRewards && ((finishReason == 22) || (finishReason == 518))) {
                    let rewardInfo = [{ RewardPart: [] }];
                    let luckyDrawInfo = [{
                        CardDeck: [],
                        Items: []
                    }];

                    let eventDuration = parseInt(body.EventDurationInMilliseconds?.[0]) || 1;
                    if (eventDuration <= 0) eventDuration = 1;
    
                    let timeMultiplier = eventData.rewardsTimeLimit / eventDuration;
                    if (timeMultiplier > 1) timeMultiplier = 1;
    
                    const matchRank = parseInt(body.Rank?.[0]) || 1;
                    const perfectStart = body.PerfectStart?.[0] == "1";
                    const topSpeed = parseInt(body.TopSpeed?.[0]) || 0;
    
                    const baseCash = Math.trunc(eventRewards.baseCashReward * (playerObject.level * eventRewards.levelCashRewardMultiplier) * timeMultiplier);
                    const baseRep = Math.trunc(eventRewards.baseRepReward * (playerObject.level * eventRewards.levelRepRewardMultiplier) * timeMultiplier);
    
                    let cashEarnings = baseCash;
                    let repEarnings = baseRep;

                    rewardInfo[0].RewardPart.push({
                        TokenPart: [`${baseCash}`],
                        RepPart: [`${baseRep}`],
                        RewardCategory: ["Base"],
                        RewardType: ["None"]
                    });
    
                    if (perfectStart) {
                        const perfectStartCash = Math.trunc(baseCash * eventRewards.perfectStartCashMultiplier);
                        const perfectStartRep = Math.trunc(baseRep * eventRewards.perfectStartRepMultiplier);

                        cashEarnings += perfectStartCash;
                        repEarnings += perfectStartRep;

                        rewardInfo[0].RewardPart.push({
                            TokenPart: [`${perfectStartCash}`],
                            RepPart: [`${perfectStartRep}`],
                            RewardCategory: ["Bonus"],
                            RewardType: ["None"]
                        });
                    }
    
                    if (eventRewards.minTopSpeedTrigger < topSpeed) {
                        const topSpeedCash = Math.trunc(baseCash * eventRewards.topSpeedCashMultiplier);
                        const topSpeedRep = Math.trunc(baseRep * eventRewards.topSpeedRepMultiplier);
                        
                        cashEarnings += topSpeedCash;
                        repEarnings += topSpeedRep;
                        
                        rewardInfo[0].RewardPart.push({
                            TokenPart: [`${topSpeedCash}`],
                            RepPart: [`${topSpeedRep}`],
                            RewardCategory: ["Bonus"],
                            RewardType: ["None"]
                        });
                    }

                    let rankCash = 0;
                    let rankRep = 0;
    
                    if (eventRewards[`rank${matchRank}CashMultiplier`]) {
                        rankCash = Math.trunc(baseCash * eventRewards[`rank${matchRank}CashMultiplier`]);
                    }
    
                    if (eventRewards[`rank${matchRank}RepMultiplier`]) {
                        rankRep = Math.trunc(baseRep * eventRewards[`rank${matchRank}RepMultiplier`]);
                    }

                    cashEarnings += rankCash;
                    repEarnings += rankRep;

                    rewardInfo[0].RewardPart.push({
                        TokenPart: [`${rankCash}`],
                        RepPart: [`${rankRep}`],
                        RewardCategory: ["Rank"],
                        RewardType: ["None"]
                    });

                    const finalCash = Math.trunc(baseCash * eventRewards.finalCashRewardMultiplier);
                    const finalRep = Math.trunc(baseRep * eventRewards.finalRepRewardMultiplier);

                    cashEarnings += finalCash;
                    repEarnings += finalRep;

                    rewardInfo[0].RewardPart.push({
                        TokenPart: [`${finalCash}`],
                        RepPart: [`${finalRep}`],
                        RewardCategory: ["Bonus"],
                        RewardType: ["None"]
                    });

                    if ((event == "Pursuit") || (event == "TeamEscape")) {
                        const multipliers = [
                            {
                                multiplier: (parseInt(body.SpikeStripsDodged?.[0]) || 0) * 0.35,
                                rewardType: "SpikeStripsDodged"
                            },
                            {
                                multiplier: (parseInt(body.RoadBlocksDodged?.[0]) || 0) * 0.25,
                                rewardType: "RoadblocksDodged"
                            },
                            {
                                multiplier: (parseInt(body.Infractions?.[0]) || 0) * 0.002,
                                rewardType: "Infractions"
                            },
                            {
                                multiplier: (parseInt(body.CostToState?.[0]) || 0) * 0.0001,
                                rewardType: "CostToState"
                            },
                            {
                                multiplier: (parseInt(body.CopsRammed?.[0]) || 0) * 0.05,
                                rewardType: "CopCarsRammed"
                            },
                            {
                                multiplier: (parseInt(body.CopsDisabled?.[0]) || 0) * 0.15,
                                rewardType: "CopCarsDisabled"
                            },
                            {
                                multiplier: (parseInt(body.CopsDeployed?.[0]) || 0) * 0.025,
                                rewardType: "CopCarsDeployed"
                            },
                            {
                                multiplier: (parseInt(body.Heat?.[0]) || 0) * 0.25,
                                rewardType: "HeatLevel"
                            }
                        ];

                        for (let m of multipliers) {
                            const cashReward = Math.trunc(baseCash * m.multiplier);
                            const repReward = Math.trunc(baseRep * m.multiplier);

                            if (cashReward || repReward) {
                                cashEarnings += cashReward;
                                repEarnings += repReward;
                                
                                rewardInfo[0].RewardPart.push({
                                    TokenPart: [`${cashReward}`],
                                    RepPart: [`${repReward}`],
                                    RewardCategory: ["Pursuit"],
                                    RewardType: [m.rewardType]
                                });
                            }
                        }
                    }

                    cashEarnings = Math.trunc(cashEarnings);
                    repEarnings = Math.trunc(repEarnings);

                    let luckyItemCash = 0;

                    const rankRewardTableId = eventRewards[`rewardTable_rank${matchRank}_id`];

                    if (rankRewardTableId) {
                        const finalItem = rewardManager.weightedRandomTableItemById(rankRewardTableId);

                        if (finalItem.success) {
                            switch (finalItem.data.type) {
                                case "CashReward": {
                                    luckyItemCash += finalItem.data.quantity;
                                    break;
                                }

                                default: {
                                    if (finalItem.data.isInventoryItem) {
                                        let invenItem = {
                                            EntitlementTag: [finalItem.data.item.entitlementTag],
                                            Hash: [finalItem.data.item.hash],
                                            ResellPrice: [finalItem.data.item.resalePrice],
                                            RemainingUseCount: [finalItem.data.quantity],
                                            VirtualItemType: [finalItem.data.item.productType]
                                        };
                                        
                                        await inventoryManager.addInventoryItems(personaId, [invenItem]);
                                    }
                                    
                                    break;
                                }
                            }

                            const cardDecks = {
                                1: "LD_CARD_GOLD",
                                2: "LD_CARD_SILVER",
                                3: "LD_CARD_BRONZE"
                            };

                            luckyDrawInfo[0].CardDeck = [cardDecks[matchRank] || "LD_CARD_BLUE"];
                            luckyDrawInfo[0].Items = [{
                                LuckyDrawItem: [{
                                    Hash: [`${finalItem.data.item.hash}`],
                                    Icon: [finalItem.data.item.icon],
                                    Description: [finalItem.data.title],
                                    VirtualItemType: [finalItem.data.item.productType]
                                }]
                            }];
                        }
                    }

                    const addMatchRewards = await personaManager.addCashAndRep(personaId, cashEarnings + luckyItemCash, repEarnings);
                    if (!addMatchRewards.success) return addMatchRewards;

                    if (addMatchRewards.data.isMaxLevel && !addMatchRewards.data.hasLeveledUp) {
                        repEarnings = 0;
                        rewardInfo[0].RewardPart.forEach(r => { r.RepPart = ["0"] });
                    }

                    accolades = [{
                        FinalRewards: [{
                            Tokens: [`${cashEarnings}`],
                            Rep: [`${repEarnings}`]
                        }],
                        RewardInfo: rewardInfo,
                        LuckyDrawInfo: luckyDrawInfo,
                        HasLeveledUp: [`${addMatchRewards.data.hasLeveledUp}`]
                    }];
                }
    
                if (body.Heat) {
                    let parsedHeat = Number(body.Heat?.[0]) || 1;
    
                    if (parsedHeat >= 1) {
                        if (parsedHeat > 5) parsedHeat = 5;
    
                        defaultCar.Heat = [`${parsedHeat}`];
                    }
                }
    
                let calculateDurability = parseInt(defaultCar.Durability[0]);
                if ((event == "Pursuit") || (event == "Route") || (event == "TeamEscape")) calculateDurability -= 5;
                else if (event == "Drag") calculateDurability -= 2;
    
                if (calculateDurability < 0) calculateDurability = 0;
    
                defaultCar.Durability = [`${calculateDurability}`];
                break;
            }
    
            case "abort": {
                playerObject.finished = true;
                break;
            }

            default: {
                return error.invalidParameters();
            }
        }
    
        fs.writeFileSync(getCarslots.data.carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));
        
        return response.createSuccess({
            [`${event}EventResult`]: {
                Accolades: accolades,
                Durability: defaultCar.Durability,
                EventSessionId: [eventSessionId],
                ExitPath: ["ExitToFreeroam"],
                InviteLifetimeInMilliseconds: ["0"],
                LobbyInviteId: ["0"],
                PersonaId: [personaId],
                Heat: defaultCar.Heat,
                Entrants: [{
                    RouteEntrantResult: [{
                        EventDurationInMilliseconds: body.EventDurationInMilliseconds,
                        EventSessionId: [eventSessionId],
                        FinishReason: body.FinishReason,
                        PersonaId: [personaId],
                        Ranking: body.Rank,
                        BestLapDurationInMilliseconds: body.BestLapDurationInMilliseconds,
                        TopSpeed: body.TopSpeed
                    }]
                }]
            }
        });
    }
}
