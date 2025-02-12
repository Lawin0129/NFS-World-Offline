const fs = require("fs");
const path = require("path");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const personaManager = require("./personaManager");

let self = module.exports = {
    getInventory: async (personaId) => {
        const findPersona = await personaManager.getPersonaById(personaId);

        if (findPersona.success) {
            const inventoryPath = path.join(findPersona.data.driverDirectory, "objects.xml");

            return functions.createResponse(true, {
                inventoryData: fs.readFileSync(inventoryPath).toString(),
                inventoryPath: inventoryPath
            });
        }
        
        return functions.createResponse(false, {});
    },
    addInventoryItem: async (personaId, inventoryItemTrans) => {
        const getInventory = await self.getInventory(personaId);

        if (getInventory.success) {
            let parsedInventory = await xmlParser.parseXML(getInventory.data.inventoryData);

            if (!(parsedInventory.InventoryTrans.InventoryItems?.[0]?.InventoryItemTrans)) {
                parsedInventory.InventoryTrans.InventoryItems = [{ InventoryItemTrans: [] }];
            }

            let inventoryItems = parsedInventory.InventoryTrans.InventoryItems[0];
            let findItem = inventoryItems.InventoryItemTrans.find(item => item.Hash?.[0] == inventoryItemTrans.Hash[0]);

            if (findItem) {
                let newItemQuantity = Number(findItem.RemainingUseCount[0]) + Number(inventoryItemTrans.RemainingUseCount[0]);

                findItem.RemainingUseCount = [`${newItemQuantity}`];
            } else {
                inventoryItems.InventoryItemTrans.push(inventoryItemTrans);
            }

            fs.writeFileSync(getInventory.data.inventoryPath, xmlParser.buildXML(parsedInventory));

            return functions.createResponse(true, findItem ? findItem : inventoryItemTrans);
        }

        return functions.createResponse(false, {});
    },
    useInventoryItem: async (personaId, itemHash, itemType, useCount) => {
        const getInventory = await self.getInventory(personaId);

        if (getInventory.success) {
            let parsedInventory = await xmlParser.parseXML(getInventory.data.inventoryData);

            if (!(parsedInventory.InventoryTrans.InventoryItems?.[0]?.InventoryItemTrans)) {
                parsedInventory.InventoryTrans.InventoryItems = [{ InventoryItemTrans: [] }];
            }

            let inventoryItems = parsedInventory.InventoryTrans.InventoryItems[0];
            let findItem = inventoryItems.InventoryItemTrans.find(item => (item.Hash?.[0] == itemHash) && (item.VirtualItemType?.[0]?.toLowerCase?.() == itemType.toLowerCase()));

            if (findItem) {
                let newItemQuantity = Number(findItem.RemainingUseCount[0]) - useCount;

                if (newItemQuantity >= 0) {
                    findItem.RemainingUseCount = [`${newItemQuantity}`];
                    
                    fs.writeFileSync(getInventory.data.inventoryPath, xmlParser.buildXML(parsedInventory));
                    
                    return functions.createResponse(true, {});
                }
            }
        }

        return functions.createResponse(false, {});
    }
}