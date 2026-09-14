const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const response = require("../utils/response");
const error = require("../utils/error");
const personaManager = require("./personaManager");

let self = module.exports = {
    getInventory: async (personaId) => {
        const findPersona = await personaManager.getPersonaById(personaId);
        if (!findPersona.success) return error.personaNotFound();
        
        const inventoryPath = path.join(findPersona.data.driverDirectory, "objects.xml");
        let inventoryData = fs.readFileSync(inventoryPath).toString();
        const parsedInventory = await xmlParser.parseXML(inventoryData);

        if (!Array.isArray(parsedInventory.InventoryTrans.InventoryItems?.[0]?.InventoryItemTrans)) {
            parsedInventory.InventoryTrans.InventoryItems = [{ InventoryItemTrans: [] }];
        }

        let inventoryTrans = parsedInventory.InventoryTrans;
        let inventoryItems = inventoryTrans.InventoryItems[0];

        let itemDataMap = new Map();
        let perfPartsUsedSlotCount = 0;
        let skillModPartsUsedSlotCount = 0;
        let visualPartsUsedSlotCount = 0;
        let inventoryChanged = false;

        // syncs entitlement tag and resell prices by item hash
        // because the game client does not recognize different entitlement tags and resell prices of the same item hash
        for (let item of inventoryItems.InventoryItemTrans) {
            let entitlementId = item.EntitlementTag?.[0];

            // convert hashes into 32-bit because NFS World is 32-bit
            let newHash = `${(parseInt(item.Hash?.[0]) || 0) | 0}`;

            if (item.Hash?.[0] != newHash) {
                item.Hash = [newHash];
                inventoryChanged = true;
            }

            let hash = item.Hash?.[0];
            let resellPrice = parseInt(item.ResellPrice?.[0]);

            if (!Number.isInteger(resellPrice)) {
                resellPrice = 0;
                item.ResellPrice = [`${resellPrice}`];
                inventoryChanged = true;
            }

            if ((typeof entitlementId) != "string") {
                entitlementId = `LAWIN_${item.Hash?.[0]}`;
                item.EntitlementTag = [`${entitlementId}`];
                inventoryChanged = true;
            }

            let virtualItemType = item.VirtualItemType?.[0]?.toLowerCase?.();

            if (virtualItemType == "performancepart") {
                perfPartsUsedSlotCount += 1;
            } else if (virtualItemType == "skillmodpart") {
                skillModPartsUsedSlotCount += 1;
            } else if (virtualItemType == "visualpart") {
                visualPartsUsedSlotCount += 1;
            }

            const itemData = itemDataMap.get(hash);

            if (!itemData) {
                itemDataMap.set(hash, {
                    entitlementTag: entitlementId,
                    resellPrice: resellPrice
                });
                continue;
            }

            if (entitlementId != itemData.entitlementTag) {
                item.EntitlementTag = [`${itemData.entitlementTag}`];
                inventoryChanged = true;
            }

            if (resellPrice != itemData.resellPrice) {
                item.ResellPrice = [`${itemData.resellPrice}`];
                inventoryChanged = true;
            }
        }

        let oldPerfPartsCount = parseInt(inventoryTrans.PerformancePartsUsedSlotCount?.[0]);
        let oldSkillPartsCount = parseInt(inventoryTrans.SkillModPartsUsedSlotCount?.[0]);
        let oldVisualPartsCount = parseInt(inventoryTrans.VisualPartsUsedSlotCount?.[0]);

        if (oldPerfPartsCount != perfPartsUsedSlotCount) {
            inventoryTrans.PerformancePartsUsedSlotCount = [`${perfPartsUsedSlotCount}`];
            inventoryChanged = true;
        }

        if (oldSkillPartsCount != skillModPartsUsedSlotCount) {
            inventoryTrans.SkillModPartsUsedSlotCount = [`${skillModPartsUsedSlotCount}`];
            inventoryChanged = true;
        }

        if (oldVisualPartsCount != visualPartsUsedSlotCount) {
            inventoryTrans.VisualPartsUsedSlotCount = [`${visualPartsUsedSlotCount}`];
            inventoryChanged = true;
        }

        if (inventoryChanged) {
            inventoryData = xmlParser.buildXML(parsedInventory, { pretty: true });
            fs.writeFileSync(inventoryPath, inventoryData);
        }
        
        return response.createSuccess({
            parsedInventory: parsedInventory,
            inventoryData: inventoryData,
            inventoryPath: inventoryPath
        });
    },
    addInventoryItems: async (personaId, inventoryItemTransList) => {
        if (!Array.isArray(inventoryItemTransList)) return error.invalidParameters();

        const getInventory = await self.getInventory(personaId);
        if (!getInventory.success) return error.personaNotFound();

        let parsedInventory = getInventory.data.parsedInventory;
        let inventoryItems = parsedInventory.InventoryTrans.InventoryItems[0];
        let addedItems = [];

        for (let inventoryItemTrans of inventoryItemTransList) {
            let invenItemHash = parseInt(inventoryItemTrans.Hash?.[0]) || 0;
            let invenItem = {
                EntitlementTag: [`LAWIN_${invenItemHash}`],
                Hash: [`${invenItemHash}`],
                RemainingUseCount: [`${parseInt(inventoryItemTrans.RemainingUseCount?.[0]) || 1}`],
                ResellPrice: [`${parseInt(inventoryItemTrans.ResellPrice?.[0]) || 0}`],
                Status: ["ACTIVE"],
                VirtualItemType: [inventoryItemTrans.VirtualItemType?.[0] || ""]
            };
            let findItem;

            if (invenItem.VirtualItemType[0].toLowerCase() == "powerup") {
                findItem = inventoryItems.InventoryItemTrans.find(i => (parseInt(i.Hash?.[0]) || 0) == invenItemHash);

                let remainingUseCount = parseInt(findItem.RemainingUseCount?.[0]) || 0;
                let newItemQuantity = remainingUseCount + parseInt(invenItem.RemainingUseCount[0]);

                findItem.RemainingUseCount = [`${newItemQuantity}`];
            } else {
                inventoryItems.InventoryItemTrans.push(invenItem);
            }

            addedItems.push(findItem ?? invenItem);
        }
        
        fs.writeFileSync(getInventory.data.inventoryPath, xmlParser.buildXML(parsedInventory, { pretty: true }));
        
        return response.createSuccess(addedItems);
    },
    useInventoryItems: async (personaId, items) => {
        if (!Array.isArray(items)) return error.invalidParameters();

        const getInventory = await self.getInventory(personaId);
        if (!getInventory.success) return getInventory;

        let parsedInventory = getInventory.data.parsedInventory;
        let inventoryItems = parsedInventory.InventoryTrans.InventoryItems[0];

        let used = [];
        let failedToApply = false;

        for (let itemInfo of items) {
            let parsedUseCount = parseInt(itemInfo.useCount) || 1;
            let parsedHash = parseInt(itemInfo.itemHash) || 0;
            let itemType = itemInfo.itemType || "";

            let itemFound = false;
            let invalidInventoryItemType = false;
            let hasBeenUsed = false;
            let usedItem = {
                hash: parsedHash
            };

            for (let idx = 0; idx < inventoryItems.InventoryItemTrans.length; idx++) {
                let item = inventoryItems.InventoryItemTrans[idx];
                let parsedInventoryItemHash = parseInt(item.Hash?.[0]) || 0;

                if (parsedInventoryItemHash == parsedHash) {
                    itemFound = true;

                    if (item.VirtualItemType?.[0]?.toLowerCase?.() == itemType.toLowerCase()) {
                        let newItemQuantity = (parseInt(item.RemainingUseCount?.[0]) || 0) - parsedUseCount;

                        if (newItemQuantity >= 0) item.RemainingUseCount = [`${newItemQuantity}`];
                        else {
                            inventoryItems.InventoryItemTrans.splice(idx, 1);
                            idx -= 1;
                            continue;
                        }

                        if ((newItemQuantity == 0) || (item.VirtualItemType?.[0]?.toLowerCase?.() != "powerup")) {
                            inventoryItems.InventoryItemTrans.splice(idx, 1);
                            idx -= 1;
                        }

                        invalidInventoryItemType = false;
                        hasBeenUsed = true;
                        break;
                    } else {
                        invalidInventoryItemType = true;
                    }
                }
            }

            if (!itemFound) {
                usedItem.data = error.inventoryItemNotFound();
                failedToApply = true;
            } else if (invalidInventoryItemType) {
                usedItem.data = error.invalidInventoryItemType();
                failedToApply = true;
            } else if (!hasBeenUsed) {
                usedItem.data = error.insufficientInventoryUseCount();
                failedToApply = true;
            } else {
                usedItem.data = response.createSuccess();
            }

            used.push(usedItem);
        }

        if (!failedToApply) {
            fs.writeFileSync(getInventory.data.inventoryPath, xmlParser.buildXML(parsedInventory, { pretty: true }));
        }
        
        return response.createSuccess({
            usedItems: used,
            failedToApply: failedToApply
        });
    },
    sellEntitlements: async (personaId, entitlements) => {
        if (!entitlements.every(id => ((typeof id) == "string"))) return error.invalidParameters();
        
        const getInventory = await self.getInventory(personaId);
        if (!getInventory.success) return getInventory;
        
        let cashChange = 0;

        let parsedInventory = getInventory.data.parsedInventory;
        let inventoryItems = parsedInventory.InventoryTrans.InventoryItems[0];

        for (let entitlementTag of entitlements) {
            let itemIndex = inventoryItems.InventoryItemTrans.findIndex(item => item.EntitlementTag?.[0] == entitlementTag);

            if (itemIndex != -1) {
                const invItem = inventoryItems.InventoryItemTrans[itemIndex];
                const resalePrice = parseInt(invItem.ResellPrice?.[0]) || 0;

                cashChange += resalePrice;
                
                inventoryItems.InventoryItemTrans.splice(itemIndex, 1);
            }
        }

        if (cashChange != 0) await personaManager.addCash(personaId, cashChange);

        fs.writeFileSync(getInventory.data.inventoryPath, xmlParser.buildXML(parsedInventory, { pretty: true }));

        return response.createSuccess();
    }
}
