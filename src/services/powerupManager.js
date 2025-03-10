const response = require("../utils/response");
const error = require("../utils/error");
const xmlParser = require("../utils/xmlParser");
const inventoryManager = require("../services/inventoryManager");
const xmppManager = require("../services/xmppManager");
let catalogManager;

function initialiseCatalogManager() {
    catalogManager = require("../services/catalogManager");

    return catalogManager;
}

let self = module.exports = {
    activatePowerup: async (itemHash) => {
        if ((typeof itemHash) != "string") return error.invalidParameters();
        
        const getActiveXmppClientData = xmppManager.getActiveXmppClientData();
        if (!getActiveXmppClientData.success) return getActiveXmppClientData;

        const useItem = await inventoryManager.useInventoryItem(getActiveXmppClientData.data.personaId, itemHash, "powerup", 1);
        if (!useItem.success) return useItem;
        
        xmppManager.sendMessage(getActiveXmppClientData.data, xmlParser.buildXML({
            response: {
                $: {
                    status: "1",
                    ticket: "0"
                },
                PowerupActivated: [{
                    $: {
                        "xmlns:i": "http://www.w3.org/2001/XMLSchema-instance",
                        "xmlns": "http://schemas.datacontract.org/2004/07/Victory.DataLayer.Serialization.PowerUp"
                    },
                    Count: ["1"],
                    Id: [itemHash],
                    PersonaId: [getActiveXmppClientData.data.personaId],
                    TargetPersonaId: ["0"]
                }]
            }
        }));
        
        return response.createSuccess();
    },
    purchasePowerup: async (personaId, productId) => {
        if ((typeof productId) != "string") return error.invalidParameters();
        
        const getCategory = (catalogManager ?? initialiseCatalogManager()).getCategory("productsInCategory_STORE_POWERUPS");
        if (!getCategory.success) return getCategory;
        
        const parsedCatalog = await xmlParser.parseXML(getCategory.data.categoryData);
        const findItem = parsedCatalog.ArrayOfProductTrans.ProductTrans.find(item => item.ProductId?.[0] == productId);
        if (!findItem) return error.basketItemNotFound();
        
        let inventoryItemTrans = {
            Hash: findItem.Hash,
            RemainingUseCount: findItem.UseCount,
            ResellPrice: ["0.0"],
            Status: ["ACTIVE"],
            VirtualItemType: ["powerup"]
        };
        
        const addItem = await inventoryManager.addInventoryItem(personaId, inventoryItemTrans);
        if (!addItem.success) return addItem;
        
        return response.createSuccess();
    }
}