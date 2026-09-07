const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const response = require("../utils/response");
const error = require("../utils/error");
const xmlParser = require("../utils/xmlParser");
const carManager = require("./carManager");
const powerupManager = require("../services/powerupManager");
const personaManager = require("../services/personaManager");

let self = module.exports = {
    getCategory: (categoryId) => {
        if ((typeof categoryId) != "string") return error.invalidParameters();
        
        const categoryPath = path.join(paths.dataPath, "catalog", `${path.basename(categoryId)}.xml`);
        if (!fs.existsSync(categoryPath)) return error.catalogNotFound();
        
        return response.createSuccess({
            categoryData: fs.readFileSync(categoryPath).toString(),
            categoryPath: categoryPath
        });
    },
    getBasketItem: (basketId) => {
        if ((typeof basketId) != "string") return error.invalidParameters();
        
        const basketPath = path.join(paths.dataPath, "basket", `${path.basename(basketId)}.xml`);
        if (!fs.existsSync(basketPath)) return error.basketItemNotFound();
        
        return response.createSuccess({
            basketData: fs.readFileSync(basketPath).toString(),
            basketPath: basketPath
        });
    },
    getAllCatalogProducts: async () => {
        let catalog = [];
        const catalogNames = fs.readdirSync(path.join(paths.dataPath, "catalog")).filter(n => n.endsWith(".xml"));

        for (let catalogName of catalogNames) {
            let categoryName = catalogName.split(".")[0];

            const catalogData = self.getCategory(categoryName);
            const parsedCatalogData = await xmlParser.parseXML(catalogData.data.categoryData);

            if (Array.isArray(parsedCatalogData?.ArrayOfProductTrans?.ProductTrans)) {
                for (let p of parsedCatalogData.ArrayOfProductTrans.ProductTrans) {
                    p.categoryName = [categoryName];
                    catalog.push(p);
                }
            } else if (Array.isArray(parsedCatalogData?.ArrayOfCategoryTrans?.CategoryTrans)) {
                for (let catalogCategory of parsedCatalogData.ArrayOfCategoryTrans.CategoryTrans) {
                    if (Array.isArray(catalogCategory.Products?.[0]?.ProductTrans)) {
                        for (let p of catalogCategory.Products[0].ProductTrans) {
                            p.categoryName = [categoryName];
                            catalog.push(p);
                        }
                    }
                }
            }
        }

        return response.createSuccess(catalog);
    },
    purchaseItems: async (personaId, basketItems) => {
        const findPersona = await personaManager.getPersonaById(personaId);
        if (!findPersona.success) return error.personaNotFound();

        let cashChange = 0;
        let boostChange = 0;

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
                Wallets: [{
                    WalletTrans: [
                        {
                            Balance: [parseInt(findPersona.data.personaInfo.Cash?.[0]) || 0],
                            Currency: ["CASH"]
                        },
                        {
                            Balance: [parseInt(findPersona.data.personaInfo.Boost?.[0]) || 0],
                            Currency: ["BOOST"]
                        }
                    ]
                }],
                Status: [""]
            }
        };
        const allCatalogs = await self.getAllCatalogProducts();
        let purchasedItems = [];

        for (let basketItem of basketItems) {
            const productItem = allCatalogs.data.find(product => product.ProductId?.[0] == basketItem.productId);
            if (!productItem) continue;
            
            let priceMultiplier = (parseInt(productItem.UseCount?.[0]) * parseInt(basketItem.quantity)) || 1;
            
            if (productItem.categoryName[0] == "productsInCategory_STORE_POWERUPS") priceMultiplier = 1;
            
            const totalPrice = (parseInt(productItem.Price?.[0]) * priceMultiplier) || 0;
            
            if (productItem.Currency[0].toLowerCase() == "cash") {
                cashChange -= totalPrice;
            } else if (productItem.Currency[0].toLowerCase() == "_ns") {
                boostChange -= totalPrice;
            }

            purchasedItems.push(basketItem);
        }

        const cashWalletTrans = commerceTemplate.CommerceResultTrans.Wallets[0].WalletTrans.find(w => w.Currency[0] == "CASH");
        const boostWalletTrans = commerceTemplate.CommerceResultTrans.Wallets[0].WalletTrans.find(w => w.Currency[0] == "BOOST");

        const cashBal = cashWalletTrans.Balance[0] + cashChange;
        const boostBal = boostWalletTrans.Balance[0] + boostChange;

        if ((cashBal < 0) || (boostBal < 0)) {
            commerceTemplate.CommerceResultTrans.Status = ["Fail_InsufficientFunds"];
            return response.createSuccess(commerceTemplate);
        }

        cashWalletTrans.Balance = [cashBal];
        boostWalletTrans.Balance = [boostBal];

        for (let purchasedItem of purchasedItems) {
            let getBasketItem = self.getBasketItem(purchasedItem.productId);

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
                const productItem = allCatalogs.data.find(product => product.ProductId?.[0] == purchasedItem.productId);
                
                if (productItem) {
                    if (productItem.categoryName[0] == "productsInCategory_STORE_POWERUPS") {
                        await powerupManager.purchasePowerup(personaId, purchasedItem.productId);
                    }
                }
            }
        }

        if (cashChange != 0) await personaManager.addCash(personaId, cashChange);
        if (boostChange != 0) await personaManager.addBoost(personaId, boostChange);

        commerceTemplate.CommerceResultTrans.Status = ["Success"];
        
        return response.createSuccess(commerceTemplate);
    }
}
