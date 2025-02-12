const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const inventoryManager = require("../services/inventoryManager");

let self = module.exports = {
    activatePowerup: async (itemHash) => {
        const xmppClientData = global.xmppClientData;
        if (!xmppClientData) return functions.createResponse(false, {});

        const useItem = await inventoryManager.useInventoryItem(xmppClientData.personaId, itemHash, "powerup", 1);

        if (useItem.success) {
            let powerupMessage = {
                message: {
                    $: {
                        from: "nfsw.engine.LAWIN@localhost/EA_Chat",
                        id: "LAWIN",
                        to: `nfsw.${xmppClientData.personaId}@localhost`
                    },
                    body: [
                        `<response status='1' ticket='0'><PowerupActivated xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://schemas.datacontract.org/2004/07/Victory.DataLayer.Serialization.PowerUp\"><Count>1</Count><Id>${itemHash}</Id><PersonaId>${xmppClientData.personaId}</PersonaId><TargetPersonaId>0</TargetPersonaId></PowerupActivated></response>`
                    ],
                    subject: [
                        "LAWIN"
                    ]
                }
            };
            
            xmppClientData.secureSocket.write(xmlParser.buildXML(powerupMessage));

            return functions.createResponse(true, {});
        }

        return functions.createResponse(false, {});
    },
    purchasePowerup: async (personaId, productId) => {
        let categoryPath = path.join(paths.dataPath, "catalog", "productsInCategory_STORE_POWERUPS.xml");

        if (fs.existsSync(categoryPath)) {
            const parsedCatalog = await xmlParser.parseXML(fs.readFileSync(categoryPath).toString());

            const findItem = parsedCatalog.ArrayOfProductTrans.ProductTrans.find(item => item.ProductId[0] == productId);
            
            if (findItem) {
                let inventoryItemTrans = {
                    Hash: findItem.Hash,
                    RemainingUseCount: findItem.UseCount,
                    ResellPrice: ["0.0"],
                    Status: ["ACTIVE"],
                    VirtualItemType: ["powerup"]
                }

                const addItem = await inventoryManager.addInventoryItem(personaId, inventoryItemTrans);

                if (addItem.success) return functions.createResponse(true, {});
            }
        }

        return functions.createResponse(false, {});
    }
}