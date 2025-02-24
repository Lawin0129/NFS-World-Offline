const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const xmlParser = require("../utils/xmlParser");
const personaManager = require("../services/personaManager");
const carManager = require("../services/carManager");
const catalogManager = require("../services/catalogManager");
const inventoryManager = require("../services/inventoryManager");

// Get Cars from Persona
app.get("/personas/:personaId/:carsType", compression({ threshold: 0 }), async (req, res, next) => {
    let carsType = req.params.carsType;
    if (carsType == "objects") return next();

    res.type("application/xml");

    switch (carsType) {
        case "carslots": {
            const getCarslots = await carManager.getCarslots(req.params.personaId);

            if (getCarslots.success) {
                res.send(getCarslots.data.carslotsData);
                return;
            }
            
            break;
        }

        case "cars": {
            const getCars = await carManager.getCars(req.params.personaId);

            if (getCars.success) {
                res.send(xmlParser.buildXML(getCars.data));
                return;
            }

            break;
        }

        case "defaultcar": {
            const getDefaultCar = await carManager.getDefaultCar(req.params.personaId);

            if (getDefaultCar.success) {
                res.send(xmlParser.buildXML(getDefaultCar.data));
                return;
            }

            break;
        }

        default: {
            res.status(403).send("<EngineError><Message>Invalid cars type</Message></EngineError>");
            return;
        }
    }

    let filePath = path.join(paths.dataPath, "personas", path.basename(req.params.personaId), `${carsType}.xml`);
    
    if (fs.existsSync(filePath)) {
        res.send(fs.readFileSync(filePath).toString());
        return;
    }
    
    res.status(403).end();
});

// Set Default Car
app.put("/personas/:personaId/defaultcar/:carId", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    const setDefaultCar = await carManager.setDefaultCar(req.params.personaId, req.params.carId);

    if (setDefaultCar.success) {
        res.status(200).end();
    } else {
        res.status(404).end();
    }
});

// Sell Car
app.post("/personas/:personaId/cars", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    const sellCar = await carManager.sellCar(req.params.personaId, req.query.serialNumber);

    if (sellCar.success) {
        res.send(xmlParser.buildXML(sellCar.data));
    } else {
        res.status(200).end();
    }
});

// dont even know what this is for, my guess would be initializing the car?
// from what I know this gets requested when you save car customization changes
app.put("/personas/:personaId/cars", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    const getDefaultCar = await carManager.getDefaultCar(req.params.personaId);

    if (getDefaultCar.success) {
        res.send(xmlParser.buildXML(getDefaultCar.data));
    } else {
        res.status(404).end();
    }
});

// Customize Car
app.post("/personas/:personaId/commerce", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let parsedBody = await xmlParser.parseXML(req.body);
    let customCar = parsedBody?.CommerceSessionTrans?.UpdatedCar?.[0]?.CustomCar?.[0];
    
    const saveCar = await carManager.saveCar(req.params.personaId, customCar);
    
    if (saveCar.success) {
        res.send(xmlParser.buildXML({
            CommerceSessionResultTrans: {
                Status: ["Success"],
                UpdatedCar: saveCar.data
            }
        }));
    } else {
        res.status(404).end();
    }
});

// Get Inventory from Persona
app.get("/personas/inventory/objects", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    const activePersona = personaManager.getActivePersona();
    if (!activePersona.success) return res.status(404).send(activePersona.data);

    const getInventory = await inventoryManager.getInventory(activePersona.data.personaId);

    if (getInventory.success) {
        res.send(getInventory.data.inventoryData);
    } else {
        res.status(404).end();
    }
});

// Purchasing (cars, etc...)
app.post("/personas/:personaId/baskets", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");
    
    let parsedBody = await xmlParser.parseXML(req.body);
    let ProductId = parsedBody?.BasketTrans?.Items?.[0]?.BasketItemTrans?.[0]?.ProductId?.[0];
    
    const purchaseItem = await catalogManager.purchaseItem(req.params.personaId, ProductId);
    
    if (purchaseItem.success) {
        res.send(xmlParser.buildXML(purchaseItem.data));
    } else {
        res.status(404).end();
    }
});

// Repair Car
app.get("/car/repair", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    const repairCar = await carManager.repairDefaultCar(req.query.personaId);

    if (repairCar.success) {
        res.send("<int>100</int>");
    } else {
        res.status(404).end();
    }
});

// Edit Motto
app.post("/DriverPersona/UpdateStatusMessage", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");
    
    let parsedBody = await xmlParser.parseXML(req.body);
    let targetPersonaId = parsedBody?.PersonaMotto?.personaId?.[0];
    let targetMotto = parsedBody?.PersonaMotto?.message?.[0];
    
    const setMotto = await personaManager.setMotto(targetPersonaId, targetMotto);
    
    if (setMotto.success) {
        res.send(xmlParser.buildXML({
            PersonaMotto: {
                message: targetMotto,
                personaId: targetPersonaId
            }
        }));
    } else {
        res.status(404).end();
    }
});

// Get driver information
app.get("/DriverPersona/GetPersonaInfo", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    const findPersona = await personaManager.getPersonaById(req.query.personaId);

    if (findPersona.success) {
        let personaInfo = findPersona.data.personaInfo;

        if ((global.newDriver?.personaId == req.query.personaId) && (global.newDriver?.numOfReqs < 2)) {
            // enable tutorial for newly created drivers by spoofing level
            if (global.newDriver.numOfReqs == 1) {
                personaInfo.Level = ["1"];
            }
            global.newDriver.numOfReqs += 1;
        }

        res.send(xmlParser.buildXML({
            ProfileData: personaInfo
        }));
        return;
    }

    if ((typeof req.query.personaId) == "string") {
        let filePath = path.join(paths.dataPath, "personas", path.basename(req.query.personaId), "GetPersonaInfo.xml");
        
        if (fs.existsSync(filePath)) {
            res.send(fs.readFileSync(filePath).toString());
            return;
        }
    }

    res.status(404).end();
});

// Get base driver information
app.post("/DriverPersona/GetPersonaBaseFromList", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");
    
    let baseTemplate = {
        ArrayOfPersonaBase: {
            PersonaBase: []
        }
    }

    let parsedBody = await xmlParser.parseXML(req.body);
    let personaIds = parsedBody?.PersonaIdArray?.PersonaIds?.[0]?.["array:long"]?.filter?.(i => ((typeof i) == "string"));

    const findPersonas = await personaManager.getPersonas(personaIds);

    for (let personaData of findPersonas) {
        baseTemplate.ArrayOfPersonaBase.PersonaBase.push({ Presence: ["1"], UserId: ["1"], ...personaData.personaInfo });
    }

    if (Array.isArray(personaIds)) {
        let personasPath = path.join(paths.dataPath, "personas");

        for (let personaId of personaIds) {
            let personaInfoPath = path.join(personasPath, path.basename(personaId), "GetPersonaInfo.xml");
            
            if (fs.existsSync(personaInfoPath)) {
                let personaInfoData = await xmlParser.parseXML(fs.readFileSync(personaInfoPath).toString());

                baseTemplate.ArrayOfPersonaBase.PersonaBase.push({ Presence: ["0"], UserId: ["2"], ...personaInfoData.ProfileData });
            }
        }
    }

    res.send(xmlParser.buildXML(baseTemplate));
});

module.exports = app;