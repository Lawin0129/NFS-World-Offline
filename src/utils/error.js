const response = require("./response");

module.exports = {
    personaNotFound: () => response.createError(404, "Persona not found."),
    carNotFound: () => response.createError(404, "Car not found."),
    basketItemNotFound: () => response.createError(404, "Basket item not found."),
    catalogNotFound: () => response.createError(404, "Catalog not found."),
    inventoryItemNotFound: () => response.createError(404, "Inventory item not found."),
    invalidInventoryItemType: () => response.createError(403, "Invalid inventory item type."),
    insufficientCarsOwned: () => response.createError(403, "Not enough cars owned."),
    insufficientInventoryUseCount: () => response.createError(403, "Not enough inventory item remaining use count."),
    partApplyFail: () => response.createError(403, "An error occured while trying to apply performance/skill/visual/vinyl parts. Please make sure you own the items you are trying to apply."),
    personaMottoTooLong: () => response.createError(403, "Persona motto too long."),
    personaNameTooShort: () => response.createError(403, "Persona name too short."),
    personaNameTooLong: () => response.createError(403, "Persona name too long."),
    personaNameAlreadyTaken: () => response.createError(403, "Persona name already taken."),
    maxPersonasReached: () => response.createError(403, "Max personas reached."),
    noActivePersona: () => response.createError(404, "No active persona."),
    noActiveXmppClient: () => response.createError(404, "No active xmpp client."),
    invalidParameters: () => response.createError(400, "Invalid parameters provided.")
}
