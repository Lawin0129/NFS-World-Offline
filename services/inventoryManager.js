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
        
        return response.createSuccess({
            inventoryData: fs.readFileSync(inventoryPath).toString(),
            inventoryPath: inventoryPath
        });
    },
    addInventoryItem: async (personaId, inventoryItemTrans) => {
        if ((typeof inventoryItemTrans) != "object") return error.invalidParameters();

        const getInventory = await self.getInventory(personaId);
        if (!getInventory.success) return error.personaNotFound();
        
        let parsedInventory = await xmlParser.parseXML(getInventory.data.inventoryData);
        
        if (!parsedInventory.InventoryTrans.InventoryItems?.[0]?.InventoryItemTrans) {
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
        
        return response.createSuccess(findItem ? findItem : inventoryItemTrans);
    },
    useInventoryItem: async (personaId, itemHash, itemType, useCount) => {
        let parsedUseCount = parseInt(useCount);

        if (!Number.isInteger(parsedUseCount)) return error.invalidParameters();
        if ((typeof itemHash) != "string") return error.invalidParameters();
        if ((typeof itemType) != "string") return error.invalidParameters();

        const getInventory = await self.getInventory(personaId);
        if (!getInventory.success) return error.personaNotFound();
        
        let parsedInventory = await xmlParser.parseXML(getInventory.data.inventoryData);
        
        if (!parsedInventory.InventoryTrans.InventoryItems?.[0]?.InventoryItemTrans) {
            parsedInventory.InventoryTrans.InventoryItems = [{ InventoryItemTrans: [] }];
        }
        
        let inventoryItems = parsedInventory.InventoryTrans.InventoryItems[0];
        let findItem = inventoryItems.InventoryItemTrans.find(item => (item.Hash?.[0] == itemHash) && (item.VirtualItemType?.[0]?.toLowerCase?.() == itemType.toLowerCase()));
        if (!findItem) return error.inventoryItemNotFound();
        
        let newItemQuantity = Number(findItem.RemainingUseCount[0]) - parsedUseCount;
        if (newItemQuantity < 0) return error.insufficientInventoryUseCount();
        
        findItem.RemainingUseCount = [`${newItemQuantity}`];
        
        fs.writeFileSync(getInventory.data.inventoryPath, xmlParser.buildXML(parsedInventory));
        
        return response.createSuccess();
    }
}