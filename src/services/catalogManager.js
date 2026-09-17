const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const response = require("../utils/response");
const error = require("../utils/error");
const xmlParser = require("../utils/xmlParser");
const carManager = require("./carManager");
const personaManager = require("../services/personaManager");
const inventoryManager = require("../services/inventoryManager");

let cachedCatalog;

let self = module.exports = {
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
        const catalogNames = fs.readdirSync(path.join(paths.dataPath, "catalog")).filter(n => n.endsWith(".xml"));
        let needsUpdate = false;

        // This checks if any of the catalog xml files were modified so the server does not have to be restarted
        if (Array.isArray(cachedCatalog)) {
            if (catalogNames.length != cachedCatalog.length) needsUpdate = true;

            for (let c of cachedCatalog) {
                if (needsUpdate) break;

                try {
                    const catalogStats = fs.statSync(c.categoryPath);
                    const lastUpdated = `${catalogStats.mtime}_${catalogStats.size}`;
                    
                    if (lastUpdated != c.lastUpdated) needsUpdate = true;
                } catch {
                    needsUpdate = true;
                }
            }
        }

        if (!needsUpdate && Array.isArray(cachedCatalog)) return response.createSuccess(cachedCatalog);

        let catalog = [];
        let counts = new Map();

        for (let catalogName of catalogNames) {
            const categoryName = catalogName.split(".")[0];
            const categoryPath = path.join(paths.dataPath, "catalog", catalogName);
            const catalogData = fs.readFileSync(categoryPath).toString();
            const catalogStats = fs.statSync(categoryPath);
            const parsedCatalogData = await xmlParser.parseXML(catalogData);

            let products = [];

            // deals with duplicate and invalid product ids in catalog to prevent wrong item purchases
            const addProducts = (items) => {
                for (let p of items) {
                    let origId = p.ProductId?.[0];
                    if ((typeof origId) != "string") {
                        origId = "LAWIN_INVALID_PRODUCT_ID";
                        p.ProductId = [`${origId}`];
                    }

                    const count = counts.get(origId) ?? 0;

                    counts.set(origId, count + 1);

                    if (count > 0) {
                        p.ProductId = [`${origId}-${count}`];
                        p.OriginalProductId = [`${origId}`];

                        const newIdCount = counts.get(p.ProductId[0]) ?? 0;

                        counts.set(p.ProductId[0], newIdCount + 1);
                    }

                    // convert hashes into 32-bit because NFS World is 32-bit
                    let newHash = (parseInt(p.Hash?.[0]) || 0) | 0;
                    p.Hash = [`${newHash}`];

                    products.push(p);
                }
            }

            if (Array.isArray(parsedCatalogData?.ArrayOfProductTrans?.ProductTrans)) {
                addProducts(parsedCatalogData.ArrayOfProductTrans.ProductTrans);
            } else if (Array.isArray(parsedCatalogData?.ArrayOfCategoryTrans?.CategoryTrans)) {
                for (let catalogCategory of parsedCatalogData.ArrayOfCategoryTrans.CategoryTrans) {
                    if (Array.isArray(catalogCategory.Products?.[0]?.ProductTrans)) {
                        addProducts(catalogCategory.Products[0].ProductTrans);
                    }
                }
            }

            catalog.push({
                categoryPath: categoryPath,
                categoryName: categoryName,
                products: products,
                xmlData: xmlParser.buildXML(parsedCatalogData),
                lastUpdated: `${catalogStats.mtime}_${catalogStats.size}`
            });
        }

        cachedCatalog = catalog;

        return response.createSuccess(catalog);
    },
    getCategory: async (categoryId) => {
        if ((typeof categoryId) != "string") return error.invalidParameters();

        let allCatalogs = await self.getAllCatalogProducts();
        let catalog = allCatalogs.data.find(c => c.categoryName == categoryId);
        if (!catalog) return error.catalogNotFound();

        return response.createSuccess({
            categoryData: catalog.xmlData,
            products: catalog.products
        });
    },
    purchaseItems: async (personaId, basketItems) => {
        if (!basketItems.every(i => ((typeof i.productId) == "string") && Number.isInteger(i.quantity))) return error.invalidParameters();

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
            let productItem;

            for (let catalog of allCatalogs.data) {
                productItem = catalog.products.find(p => p.ProductId?.[0] == basketItem.productId);

                if (productItem) {
                    basketItem.categoryName = catalog.categoryName;
                    break;
                }
            }

            if (!productItem) continue;
            
            const totalPrice = (parseInt(productItem.Price?.[0]) * basketItem.quantity) || 0;
            const cashOnlyCatalogs = [
                "categories_NFSW_NA_EP_VINYLS_Category",
                "productsInCategory_NFSW_NA_EP_PAINTS_BODY_Category",
                "productsInCategory_NFSW_NA_EP_PAINTS_WHEEL_Category",
                "productsInCategory_NFSW_NA_EP_PERFORMANCEPARTS",
                "productsInCategory_NFSW_NA_EP_REPAIRS",
                "productsInCategory_NFSW_NA_EP_SKILLMODPARTS"
            ];
            
            if ((productItem.Currency?.[0] == "CASH") || cashOnlyCatalogs.includes(basketItem.categoryName)) {
                productItem.Currency = ["CASH"];
                cashChange -= totalPrice;
            } else {
                productItem.Currency = ["_NS"];
                boostChange -= totalPrice;
            }

            basketItem.productItem = productItem;

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

        let addedInventoryItems = [];

        for (let purchasedItem of purchasedItems) {
            const productItem = purchasedItem.productItem;
            let purchasedProductId = productItem.ProductId[0];

            if (purchasedItem.categoryName == "productsInCategory_NFSW_NA_EP_CARSLOTS") {
                await carManager.increaseCarSlot(personaId, purchasedItem.quantity);
                continue;
            } else if (purchasedItem.categoryName == "productsInCategory_NFSW_NA_EP_REPAIRS") {
                await carManager.repairDefaultCar(personaId, purchasedItem.quantity);
                continue;
            }

            if (productItem.OriginalProductId) {
                purchasedProductId = productItem.OriginalProductId[0];
            }

            let getBasketItem = self.getBasketItem(purchasedProductId);
            let itemResellPrice = parseInt(productItem.Price?.[0]) || 0;

            if (productItem.Currency[0] == "CASH") {
                itemResellPrice *= 0.5;
            } else {
                itemResellPrice = null;
            }

            if (getBasketItem.success) {
                let product = await xmlParser.parseXML(getBasketItem.data.basketData);
                let productRootName = xmlParser.getRootName(product);

                switch (productRootName) {
                    case "OwnedCarTrans": {
                        let customFields = {};

                        if (itemResellPrice != null) customFields.ResalePrice = [`${parseInt(itemResellPrice)}`];

                        const addCar = await carManager.addCar(personaId, product.OwnedCarTrans, customFields);

                        if (addCar.success) {
                            commerceTemplate.CommerceResultTrans.PurchasedCars = [{ OwnedCarTrans: [addCar.data] }];
                        }

                        break;
                    }
                }
            } else {
                let itemType;

                switch (purchasedItem.categoryName) {
                    case "productsInCategory_STORE_POWERUPS": {
                        itemType = "powerup";
                        break;
                    }
                    case "productsInCategory_NFSW_NA_EP_PERFORMANCEPARTS": {
                        itemType = "performancepart";
                        break;
                    }
                    case "productsInCategory_NFSW_NA_EP_SKILLMODPARTS":
                    case "productsInCategory_STORE_SKILLMODPARTS": {
                        itemType = "skillmodpart";
                        break;
                    }
                    case "categories_NFSW_NA_EP_VINYLS_Category": {
                        itemType = "vinyl";
                        break;
                    }
                }

                if (purchasedItem.categoryName.includes("VISUALPARTS") || purchasedItem.categoryName.includes("VANITY")) {
                    itemType = "visualpart";
                }

                if (!itemType) continue;

                let invenItem = {
                    Hash: productItem.Hash,
                    RemainingUseCount: productItem.UseCount,
                    ResellPrice: [`${itemResellPrice}`],
                    VirtualItemType: [itemType]
                };

                addedInventoryItems.push(invenItem);
            }
        }

        if (addedInventoryItems.length != 0) {
            const itemAdd = await inventoryManager.addInventoryItems(personaId, addedInventoryItems);

            if (itemAdd.success) {
                for (let newItem of itemAdd.data) {
                    commerceTemplate.CommerceResultTrans.InventoryItems[0].InventoryItemTrans.push(newItem);
                }
            }
        }

        if (cashChange != 0) await personaManager.addCash(personaId, cashChange);
        if (boostChange != 0) await personaManager.addBoost(personaId, boostChange);

        commerceTemplate.CommerceResultTrans.Status = ["Success"];
        
        return response.createSuccess(commerceTemplate);
    }
}
