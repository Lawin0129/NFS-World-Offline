const fs = require("fs");
const path = require("path");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const personaManager = require("./personaManager");
const carManager = require("./carManager");

let self = module.exports = {
    purchaseItem: async (personaId, productId) => {
        const findPersona = await personaManager.getPersonaById(personaId);

        if (findPersona.success) {
            let commerceTemplate = {
                CommerceResultTrans: {
                    InventoryItems: [{
                        InventoryItemTrans: [{
                            Hash: ["0"],
                            InventoryId: ["0"],
                            RemainingUseCount: ["0"],
                            ResellPrice: ["0"]
                        }]
                    }],
                    Status: ["Success"],
                }
            }

            let productPath = path.join(__dirname, "..", "data", "basket", `${path.basename(productId)}.xml`);
            
            if (fs.existsSync(productPath)) {
                let product = await xmlParser.parseXML(fs.readFileSync(productPath).toString());
                let productRootName = xmlParser.getRootName(product);
                
                switch (productRootName) {
                    case "OwnedCarTrans": {
                        const addCar = await carManager.addCar(personaId, product.OwnedCarTrans);

                        if (addCar.success) {
                            commerceTemplate.CommerceResultTrans.PurchasedCars = [{ OwnedCarTrans: [addCar.data] }];
                        }

                        break;
                    }
                }
            }
            
            return functions.createResponse(true, commerceTemplate);
        }
        
        return functions.createResponse(false, {});
    }
}