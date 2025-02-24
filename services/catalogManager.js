const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const carManager = require("./carManager");
const powerupManager = require("../services/powerupManager");

let self = module.exports = {
    getCategory: (categoryId) => {
        if ((typeof categoryId) == "string") {
            const categoryPath = path.join(paths.dataPath, "catalog", `${path.basename(categoryId)}.xml`);
            
            if (fs.existsSync(categoryPath)) {
                return functions.createResponse(true, {
                    categoryData: fs.readFileSync(categoryPath).toString(),
                    categoryPath: categoryPath
                });
            }
        }
        
        return functions.createResponse(false, {});
    },
    getBasketItem: (basketId) => {
        if ((typeof basketId) == "string") {
            const basketPath = path.join(paths.dataPath, "basket", `${path.basename(basketId)}.xml`);
            
            if (fs.existsSync(basketPath)) {
                return functions.createResponse(true, {
                    basketData: fs.readFileSync(basketPath).toString(),
                    basketPath: basketPath
                });
            }
        }
        
        return functions.createResponse(false, {});
    },
    purchaseItem: async (personaId, productId) => {
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
                Status: ["Success"]
            }
        };
        
        let getBasketItem = self.getBasketItem(productId);
        
        if (getBasketItem.success) {
            let product = await xmlParser.parseXML(getBasketItem.data.basketData);
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
        } else {
            await powerupManager.purchasePowerup(personaId, productId);
        }
        
        return functions.createResponse(true, commerceTemplate);
    }
}