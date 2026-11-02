const response = require("../utils/response");
const error = require("../utils/error");
const num = require("../utils/num");
const rewardManager = require("../services/rewardManager");
const allCatalogProducts = require("../../config/Assets/products.json");
const allRewardTables = require("../../config/Assets/reward_tables.json");
const allRewardTableItems = require("../../config/Assets/reward_table_items.json");
const allCardPacks = require("../../config/Assets/card_packs.json");
const allCardPackItems = require("../../config/Assets/card_pack_items.json");

const generator = rewardManager;

let self = module.exports = {
    openPack: (entitlementTag) => {
        if ((typeof entitlementTag) != "string") return error.invalidParameters();

        const findTable = allCardPacks.find(t => t.entitlementTag == entitlementTag);
        if (!findTable) return error.productItemNotFound();

        const findItems = allCardPackItems.filter(t => t.cardPackEntity_ID == findTable.ID);
        let generatedItems = [];

        for (let item of findItems) {
            const finalItem = eval(item.script);
            if (!finalItem.success) continue;

            generatedItems.push(finalItem.data);
        }

        return response.createSuccess(generatedItems);
    }
}
