const fs = require("fs");
const path = require("path");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const error = require("../utils/error");
const response = require("../utils/response");
const personaManager = require("../services/personaManager");
const rewardManager = require("../services/rewardManager");
const catalogManager = require("../services/catalogManager");
const inventoryManager = require("../services/inventoryManager");
const carManager = require("../services/carManager");
const treasureHuntConfigs = require("../../config/Assets/treasure_hunt_configs.json");
const allParameters = require("../../config/Assets/parameters.json");

let accolades = {};

let self = module.exports = {
    getTreasureHuntInfo: async (personaId) => {
        const findPersona = await personaManager.getPersonaById(personaId);
        if (!findPersona.success) return findPersona;
        
        const treasureInfoPath = path.join(findPersona.data.driverDirectory, "gettreasurehunteventsession.xml");
        let treasureInfoData = fs.readFileSync(treasureInfoPath).toString();
        let parsedTreasureInfo = await xmlParser.parseXML(treasureInfoData);
        let treasureInfoChanged = false;

        let treasureHuntInfo = parsedTreasureInfo.TreasureHuntEventSession;
        let generateNewDate = false;

        let isStreakBroken = treasureHuntInfo.IsStreakBroken?.[0];

        if ((typeof isStreakBroken) == "string") {
            isStreakBroken = isStreakBroken.toLowerCase() != "false";
        } else {
            isStreakBroken = false;
        }

        if (treasureHuntInfo.IsStreakBroken?.[0] != `${isStreakBroken}`) {
            treasureHuntInfo.IsStreakBroken = [`${isStreakBroken}`];
            treasureInfoChanged = true;
        }

        const currentCoins = parseInt(treasureHuntInfo.CoinsCollected?.[0]) || 0;
        const numCoins = parseInt(treasureHuntInfo.NumCoins?.[0]) || 0;
        const maxCoins = (2 ** numCoins) - 1;

        if (currentCoins != maxCoins) {
            if (treasureHuntInfo.IsCompletedForToday?.[0] == "true") {
                treasureHuntInfo.IsCompletedForToday = ["false"];
                treasureInfoChanged = true;
            }
        }

        if (currentCoins > maxCoins) {
            treasureHuntInfo.CoinsCollected = ["0"];
            treasureInfoChanged = true;
        }

        if ((typeof treasureHuntInfo.Date?.[0]) == "string") {
            const lastCompletedDate = new Date(treasureHuntInfo.Date[0]);

            if (!Number.isNaN(lastCompletedDate.getTime())) {
                const daysBetweenLastCompleted = functions.daysBetween(new Date(), lastCompletedDate);

                if (daysBetweenLastCompleted >= 1) {
                    if (daysBetweenLastCompleted >= 2) {
                        if (treasureHuntInfo.IsStreakBroken?.[0] != "true") {
                            treasureHuntInfo.IsStreakBroken = ["true"];
                            treasureInfoChanged = true;
                        }
                    }

                    if (currentCoins == maxCoins) {
                        treasureHuntInfo.CoinsCollected = ["0"];
                        treasureHuntInfo.Seed = [`${functions.randomInt32()}`];
                        treasureHuntInfo.IsCompletedForToday = ["false"];
                        treasureInfoChanged = true;
                    }
                }
            } else {
                generateNewDate = true;
            }
        } else {
            generateNewDate = true;
        }

        if (generateNewDate) {
            treasureHuntInfo.Date = [new Date().toISOString()];
            treasureHuntInfo.CoinsCollected = ["0"];
            treasureInfoChanged = true;
        }

        if (treasureInfoChanged) {
            treasureInfoData = xmlParser.buildXML(parsedTreasureInfo, { pretty: true });
            fs.writeFileSync(treasureInfoPath, treasureInfoData);
        }
        
        return response.createSuccess({
            parsedTreasureInfo: parsedTreasureInfo,
            treasureInfoData: treasureInfoData,
            treasureInfoPath: treasureInfoPath,
            persona: findPersona.data
        });
    },
    getAccolades: async (personaId) => {
        const findTreasureInfo = await self.getTreasureHuntInfo(personaId);
        if (!findTreasureInfo.success) return findTreasureInfo;

        let parsedTreasureInfo = findTreasureInfo.data.parsedTreasureInfo;
        let treasureHuntInfo = parsedTreasureInfo.TreasureHuntEventSession;

        if (treasureHuntInfo.IsCompletedForToday?.[0] == "true") return error.accoladesInvalid();

        const currentCoins = parseInt(treasureHuntInfo.CoinsCollected?.[0]) || 0;
        const numCoins = parseInt(treasureHuntInfo.NumCoins?.[0]) || 0;
        let isStreakBroken = treasureHuntInfo.IsStreakBroken?.[0] == "true";
        let streak = parseInt(treasureHuntInfo.Streak?.[0]) || 1;
        if (streak <= 0) streak = 1;

        let currentAccolades = accolades[personaId];
        if (!currentAccolades) return error.accoladesInvalid();

        if (currentCoins == ((2 ** numCoins) - 1)) {
            if (isStreakBroken) {
                streak = 1;
                isStreakBroken = false;
                currentAccolades.LuckyDrawInfo[0].CurrentStreak = [`${streak}`];
                currentAccolades.LuckyDrawInfo[0].IsStreakBroken = [`${isStreakBroken}`];
                treasureHuntInfo.Streak = [`${streak}`];
                treasureHuntInfo.IsStreakBroken = [`${isStreakBroken}`];
            } else {
                treasureHuntInfo.Streak = [`${streak + 1}`];
            }

            let treasureHuntConfig;

            for (let config of treasureHuntConfigs) {
                if (config.streak <= streak) {
                    if (!treasureHuntConfig || (config.streak > treasureHuntConfig.streak)) {
                        treasureHuntConfig = config;
                    }
                }
            }

            if (treasureHuntConfig) {
                let level = parseInt(findTreasureInfo.data.persona.personaInfo.Level?.[0]) || 1;
                if (level <= 0) streak = 1;

                const cashMultiplier = Number(allParameters.find(p => p.name == "TH_CASH_MULTIPLIER")?.value) || 0;
                const repMultiplier = Number(allParameters.find(p => p.name == "TH_REP_MULTIPLIER")?.value) || 0;
                const dayCashMultiplier = treasureHuntConfig.cash_multiplier || 0;
                const dayRepMultiplier = treasureHuntConfig.rep_multiplier || 0;

                const baseCash = (treasureHuntConfig.base_cash * level) * cashMultiplier;
                const baseRep = (treasureHuntConfig.base_rep * level) * repMultiplier;

                const dayCashReward = streak * dayCashMultiplier;
                const dayRepReward = streak * dayRepMultiplier;

                let cashEarnings = Math.trunc(baseCash + dayCashReward);
                let repEarnings = Math.trunc(baseRep + dayRepReward);

                currentAccolades.RewardInfo[0].RewardPart.push({
                    TokenPart: [`${cashEarnings}`],
                    RepPart: [`${repEarnings}`],
                    RewardCategory: ["Base"],
                    RewardType: ["None"]
                });
                
                const finalItem = await rewardManager.weightedRandomTableItemById(treasureHuntConfig.reward_table_id);
                let luckyItemCash = 0;
                
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
                            } else if (finalItem.data.item.productType?.toLowerCase?.() == "presetcar") {
                                const basketItem = catalogManager.getBasketItem(finalItem.data.item.productId);
                                
                                if (basketItem.success) {
                                    const product = await xmlParser.parseXML(basketItem.data.basketData);
                                    const ownedCarTrans = product?.OwnedCarTrans;
                                    
                                    if (ownedCarTrans) {
                                        const customFields = { ResalePrice: [`${finalItem.data.item.resalePrice}`] };
                                        await carManager.addCar(personaId, ownedCarTrans, false, customFields);
                                    }
                                }
                            }
                            
                            break;
                        }
                    }
                    
                    currentAccolades.LuckyDrawInfo[0].Items = [{
                        LuckyDrawItem: [{
                            Hash: [`${finalItem.data.item.hash}`],
                            Icon: [finalItem.data.item.icon],
                            Description: [finalItem.data.title],
                            VirtualItemType: [finalItem.data.item.productType]
                        }]
                    }];
                }
                
                const addMatchRewards = await personaManager.addCashAndRep(personaId, cashEarnings + luckyItemCash, repEarnings);
                if (!addMatchRewards.success) return addMatchRewards;

                if (addMatchRewards.data.isMaxLevel && !addMatchRewards.data.hasLeveledUp) {
                    repEarnings = 0;
                    currentAccolades.RewardInfo[0].RewardPart.forEach(r => { r.RepPart = ["0"] });
                }

                currentAccolades.HasLeveledUp = [`${addMatchRewards.data.hasLeveledUp}`];
                currentAccolades.FinalRewards = [{
                    Tokens: [`${cashEarnings}`],
                    Rep: [`${repEarnings}`]
                }];
                currentAccolades.OriginalRewards = [{
                    Tokens: [`${cashEarnings}`],
                    Rep: [`${repEarnings}`]
                }];
            }
            
            treasureHuntInfo.IsCompletedForToday = ["true"];
            treasureHuntInfo.Date = [new Date().toISOString()];
        }

        fs.writeFileSync(findTreasureInfo.data.treasureInfoPath, xmlParser.buildXML(parsedTreasureInfo, { pretty: true }));

        delete accolades[personaId];

        return response.createSuccess({ Accolades: currentAccolades });
    },
    collectCoins: async (personaId, coins) => {
        let parsedCoins = parseInt(coins);
        if (!Number.isInteger(parsedCoins)) return error.invalidParameters();

        parsedCoins = parsedCoins >>> 0;

        const findTreasureInfo = await self.getTreasureHuntInfo(personaId);
        if (!findTreasureInfo.success) return findTreasureInfo;

        let parsedTreasureInfo = findTreasureInfo.data.parsedTreasureInfo;
        let treasureHuntInfo = parsedTreasureInfo.TreasureHuntEventSession;

        const currentCoins = parseInt(treasureHuntInfo.CoinsCollected?.[0]) || 0;
        const numCoins = parseInt(treasureHuntInfo.NumCoins?.[0]) || 0;
        const maxCoins = (2 ** numCoins) - 1;

        if (currentCoins == parsedCoins) return response.createSuccess(null);
        if (currentCoins == maxCoins) return error.treasureHuntAlreadyCompleted();
        if (parsedCoins > maxCoins) return error.treasureHuntCoinsInvalid();

        const numOfCollectedCoins = (collectedCoins) => {
            let num = 0;
            
            for (let i = 0; i < 32; i++) {
                if ((collectedCoins & 1 << i) != 0) {
                    num += 1;
                }
            }
            
            return num;
        };

        const coinChange = numOfCollectedCoins(parsedCoins) - numOfCollectedCoins(currentCoins);
        const isStreakBroken = treasureHuntInfo.IsStreakBroken?.[0] == "true";
        let accoladesTemplate;

        if (coinChange == 1) {
            treasureHuntInfo.CoinsCollected = [`${parsedCoins}`];

            if (parsedCoins == maxCoins) {
                let streak = parseInt(treasureHuntInfo.Streak?.[0]) || 1;
                if (streak <= 0) streak = 1;

                accoladesTemplate = {
                    FinalRewards: [{
                        Tokens: ["0"],
                        Rep: ["0"]
                    }],
                    OriginalRewards: [{
                        Tokens: ["0"],
                        Rep: ["0"]
                    }],
                    LuckyDrawInfo: [{
                        Boxes: [{
                            LuckyDrawBox: Array(5).fill({
                                IsValid: ["true"],
                                LocalizationString: ["LD_CARD_SILVER"],
                                LuckyDrawSetCategoryId: ["1"]
                            })
                        }],
                        Items: [],
                        CurrentStreak: [streak],
                        IsStreakBroken: [`${isStreakBroken}`],
                        NumBoxAnimations: ["180"],
                        NumCards: ["0"]
                    }],
                    RewardInfo: [{ RewardPart: [] }],
                    HasLeveledUp: ["false"]
                };
                
                accolades[personaId] = accoladesTemplate;
                treasureHuntInfo.Date = [new Date().toISOString()];
            }
        } else {
            return error.treasureHuntCoinsInvalid();
        }

        fs.writeFileSync(findTreasureInfo.data.treasureInfoPath, xmlParser.buildXML(parsedTreasureInfo, { pretty: true }));

        if (accoladesTemplate && !isStreakBroken) {
            await self.getAccolades(personaId);
        }

        return response.createSuccess(accoladesTemplate ? { Accolades: accoladesTemplate } : null);
    },
    reviveStreak: async (personaId) => {
        const findTreasureInfo = await self.getTreasureHuntInfo(personaId);
        if (!findTreasureInfo.success) return findTreasureInfo;

        let parsedTreasureInfo = findTreasureInfo.data.parsedTreasureInfo;
        let treasureHuntInfo = parsedTreasureInfo.TreasureHuntEventSession;

        treasureHuntInfo.IsStreakBroken = ["false"];
        treasureHuntInfo.Date = [new Date().toISOString()];

        fs.writeFileSync(findTreasureInfo.data.treasureInfoPath, xmlParser.buildXML(parsedTreasureInfo, { pretty: true }));

        return response.createSuccess();
    }
}
