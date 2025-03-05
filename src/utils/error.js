const response = require("./response");

module.exports = {
    personaNotFound: () => response.createError(404, "Persona not found."),
    carNotFound: () => response.createError(404, "Car not found."),
    basketItemNotFound: () => response.createError(404, "Basket item not found."),
    catalogNotFound: () => response.createError(404, "Catalog not found."),
    inventoryItemNotFound: () => response.createError(404, "Inventory item not found."),
    insufficientCarsOwned: () => response.createError(403, "Not enough cars owned."),
    insufficientInventoryUseCount: () => response.createError(403, "Not enough inventory item remaining use count."),
    personaMottoTooLong: () => response.createError(403, "Persona motto too long."),
    personaNameTooShort: () => response.createError(403, "Persona name too short."),
    personaNameTooLong: () => response.createError(403, "Persona name too long."),
    personaNameAlreadyTaken: () => response.createError(403, "Persona name already taken."),
    maxPersonasReached: () => response.createError(403, "Max personas reached."),
    noActivePersona: () => response.createError(404, "No active persona."),
    noActiveXmppClient: () => response.createError(404, "No active xmpp client."),
    invalidParameters: () => response.createError(400, "Invalid parameters provided.")
}