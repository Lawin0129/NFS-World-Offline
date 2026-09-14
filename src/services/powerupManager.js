const response = require("../utils/response");
const error = require("../utils/error");
const xmlParser = require("../utils/xmlParser");
const inventoryManager = require("../services/inventoryManager");
const xmppManager = require("../services/xmppManager");

let self = module.exports = {
    activatePowerup: async (itemHash) => {
        if ((typeof itemHash) != "string") return error.invalidParameters();
        
        const getActiveXmppClientData = xmppManager.getActiveXmppClientData();
        if (!getActiveXmppClientData.success) return getActiveXmppClientData;

        const useItem = await inventoryManager.useInventoryItems(getActiveXmppClientData.data.personaId, [{ itemHash: itemHash, itemType: "powerup" }]);
        if (!useItem.success) return useItem;

        if (useItem.data.failedToApply) {
            return useItem.data.usedItems[0].data;
        }
        
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
    }
}
