const response = require("../utils/response");
const error = require("../utils/error");
const functions = require("../utils/functions");
const allCatalogProducts = require("../../config/Assets/products.json");
const allRewardTables = require("../../config/Assets/reward_tables.json");
const allRewardTableItems = require("../../config/Assets/reward_table_items.json");

const inventoryProductTypes = [
    "performancepart",
    "skillmodpart",
    "visualpart",
    "powerup"
];

const getRandomWeightedItem = (items) => {
    let totalDropWeight = 0;
    items.forEach(i => { totalDropWeight += i.dropWeight });

    if (totalDropWeight <= 0) return undefined;

    let roll = Math.random() * totalDropWeight;

    for (let item of items) {
        roll -= item.dropWeight;
        if (roll < 0) return item;
    }

    return items[items.length - 1];
}

let generator = module.exports = {
    generateSingleItem: (entitlementTag) => {
        if ((typeof entitlementTag) != "string") return error.invalidParameters();

        const finalItem = allCatalogProducts.find(i => i.entitlementTag == entitlementTag);
        if (!finalItem) return error.productItemNotFound();

        return response.createSuccess({
            item: finalItem,
            type: "SingleItem",
            title: `${finalItem.productTitle}`,
            isInventoryItem: inventoryProductTypes.includes(finalItem.productType?.toLowerCase?.()),
            quantity: 1
        });
    },
    randomDrop: (entitlementTags) => {
        if (!Array.isArray(entitlementTags)) return error.invalidParameters();

        const randomEntitlementIndex = functions.between(0, (entitlementTags.length - 1));
        const pickedEntitlementTag = entitlementTags[randomEntitlementIndex];

        const finalItem = allCatalogProducts.find(i => i.entitlementTag == pickedEntitlementTag);
        if (!finalItem) return error.productItemNotFound();

        return response.createSuccess({
            item: finalItem,
            type: "RandomDrop",
            title: `${finalItem.productTitle}`,
            isInventoryItem: inventoryProductTypes.includes(finalItem.productType?.toLowerCase?.()),
            quantity: 1
        });
    },
    cashReward: (amount) => {
        let parsedAmount = parseInt(amount);
        if (!Number.isInteger(parsedAmount)) return error.invalidParameters();

        return response.createSuccess({
            item: {
                hash: -429893590,
                icon: "128_cash",
                productType: "REWARD"
            },
            type: "CashReward",
            title: `LB_CASH,${parsedAmount}`,
            isInventoryItem: false,
            quantity: parsedAmount
        });
    },
    rewardQuantityProduct: (entitlementTag, quantity) => {
        let parsedQuantity = parseInt(quantity);

        if (!Number.isInteger(parsedQuantity)) return error.invalidParameters();
        if ((typeof entitlementTag) != "string") return error.invalidParameters();

        const finalItem = allCatalogProducts.find(i => i.entitlementTag == entitlementTag);
        if (!finalItem) return error.productItemNotFound();

        return response.createSuccess({
            item: finalItem,
            type: "QuantityProduct",
            title: `${finalItem.productTitle} x${parsedQuantity}`,
            isInventoryItem: inventoryProductTypes.includes(finalItem.productType?.toLowerCase?.()),
            quantity: parsedQuantity
        });
    },
    findRandomRatedItemByProdType: (itemType, rarity) => {
        let parsedRarity = parseInt(rarity);

        if (!Number.isInteger(parsedRarity)) return error.invalidParameters();
        if ((typeof itemType) != "string") return error.invalidParameters();

        const allSpecifiedItems = allCatalogProducts.filter(i => (i.productType?.toLowerCase?.() == itemType.toLowerCase()) && (i.rarity == parsedRarity));
        const finalItem = getRandomWeightedItem(allSpecifiedItems);
        if (!finalItem) return error.productItemNotFound();

        return response.createSuccess({
            item: finalItem,
            type: "RatedItem",
            title: `${finalItem.productTitle}`,
            isInventoryItem: inventoryProductTypes.includes(finalItem.productType?.toLowerCase?.()),
            quantity: 1
        });
    },
    findWeightedRandomItemByProdType: (itemType) => {
        if ((typeof itemType) != "string") return error.invalidParameters();
        
        const allSpecifiedItems = allCatalogProducts.filter(i => i.productType?.toLowerCase?.() == itemType.toLowerCase());
        const finalItem = getRandomWeightedItem(allSpecifiedItems);
        if (!finalItem) return error.productItemNotFound();

        return response.createSuccess({
            item: finalItem,
            type: "WeightedRandomItem",
            title: `${finalItem.productTitle}`,
            isInventoryItem: inventoryProductTypes.includes(finalItem.productType?.toLowerCase?.()),
            quantity: 1
        });
    },
    weightedRandomTableItem: (tableName) => {
        const findTable = allRewardTables.find(t => t.name == tableName);
        if (!findTable) return error.invalidParameters();

        const findItems = allRewardTableItems.filter(t => t.rewardTableEntity_ID == findTable.ID);
        const pickItem = getRandomWeightedItem(findItems);
        if (!pickItem) return error.productItemNotFound();

        const finalItem = eval(pickItem.script);
        if (!finalItem.success) return finalItem;

        return response.createSuccess(finalItem.data);
    },
    weightedRandomTableItemById: (tableId) => {
        const findItems = allRewardTableItems.filter(t => t.rewardTableEntity_ID == tableId);
        const pickItem = getRandomWeightedItem(findItems);
        if (!pickItem) return error.productItemNotFound();

        const finalItem = eval(pickItem.script);
        if (!finalItem.success) return finalItem;

        return response.createSuccess(finalItem.data);
    }
}
