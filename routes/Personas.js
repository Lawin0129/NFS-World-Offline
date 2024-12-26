const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const functions = require("../utils/functions");

Object.defineProperty(Array.prototype, 'delEmpty', {
    value: function() {
        for (let i in this) {
            if (!this[i]) this.splice(Number(i), 1);
        }

        return this;
    }
});

// Get Cars from Persona
app.get("/personas/:personaId/:carsType", compression({ threshold: 0 }), async (req, res, next) => {
    if (req.params.carsType == "objects") return next();

    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;
                if (!fs.existsSync(`./drivers/${file}/carslots.xml`)) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == req.params.personaId) {
                    let carslots = fs.readFileSync(`./drivers/${file}/carslots.xml`).toString();

                    if (req.params.carsType == "carslots") {
                        return res.send(carslots);
                    } else if (req.params.carsType == "cars") {
                        let carsTemplate = {
                            ArrayOfOwnedCarTrans: {
                                OwnedCarTrans: []
                            }
                        }

                        carslots = await xmlParser.parseXML(carslots);

                        if (!carslots.CarSlotInfoTrans.CarsOwnedByPersona) carslots.CarSlotInfoTrans.CarsOwnedByPersona = [{ OwnedCarTrans: [] }];

                        carsTemplate.ArrayOfOwnedCarTrans = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0];

                        return res.send(xmlParser.buildXML(carsTemplate));
                    } else if (req.params.carsType == "defaultcar") {
                        let defaultCar = {
                            OwnedCarTrans: {}
                        }

                        carslots = await xmlParser.parseXML(carslots);

                        if (!carslots.CarSlotInfoTrans.CarsOwnedByPersona) carslots.CarSlotInfoTrans.CarsOwnedByPersona = [{ OwnedCarTrans: [] }];

                        if (carslots.CarSlotInfoTrans.CarsOwnedByPersona.delEmpty().length <= 0) {
                            defaultCar.OwnedCarTrans = {
                                Durability: ["0"],
                                Heat: ["0.0"],
                                Id: ["0"]
                            }

                            return res.send(xmlParser.buildXML(defaultCar));
                        }

                        let defaultIndex = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
                        let defaultItem = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIndex];

                        defaultCar.OwnedCarTrans = defaultItem || {};

                        return res.send(xmlParser.buildXML(defaultCar));
                    } else {
                        return res.status(403).send("<EngineError><Message>Invalid cars type</Message></EngineError>");
                    }
                }

                drivers += 1;
            }
        } else if (req.params.carsType == "cars" || req.params.carsType == "defaultcar") {
            let filePath = `./data/personas/${req.query.personaId}/${req.params.carsType}.xml`;

            if (fs.existsSync(filePath)) return res.send(fs.readFileSync(filePath).toString());
        }
    }

    res.status(200).end();
});

// Set Default Car
app.put("/personas/:personaId/defaultcar/:carId", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;
                if (!fs.existsSync(`./drivers/${file}/carslots.xml`)) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == req.params.personaId) {
                    let carslots = await xmlParser.parseXML(fs.readFileSync(`./drivers/${file}/carslots.xml`).toString());
                    
                    let findCarIndex = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.findIndex(i => i.Id[0] == req.params.carId);
                    if (typeof findCarIndex == "number" && findCarIndex >= 0) {
                        carslots.CarSlotInfoTrans.DefaultOwnedCarIndex = [];
                        carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0] = `${findCarIndex}`;
                        fs.writeFileSync(`./drivers/${file}/carslots.xml`, xmlParser.buildXML(carslots));

                        return res.status(200).end();
                    }
                }

                drivers += 1;
            }
        }
    }

    res.status(404).end();
});

// Sell Car
app.post("/personas/:personaId/cars", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;
                if (!fs.existsSync(`./drivers/${file}/carslots.xml`)) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == req.params.personaId) {
                    let carslots = await xmlParser.parseXML(fs.readFileSync(`./drivers/${file}/carslots.xml`).toString());

                    if (carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.length <= 1) break;
                    
                    let findCarIndex = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.findIndex(i => i.Id[0] == req.query.serialNumber);

                    if (typeof findCarIndex == "number" && findCarIndex >= 0) {
                        carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.splice(findCarIndex, 1);

                        let newIndex = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.length - 1;
                        let defaultIdx = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];

                        if (!carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultIdx]) carslots.CarSlotInfoTrans.DefaultOwnedCarIndex = [`${newIndex}`];
                        else newIndex = defaultIdx;

                        fs.writeFileSync(`./drivers/${file}/carslots.xml`, xmlParser.buildXML(carslots));

                        return res.status(200).send(xmlParser.buildXML({
                            OwnedCarTrans: carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[newIndex]
                        }));
                    }
                }

                drivers += 1;
            }
        }
    }

    res.status(200).end();
});

// dont even know what this is for, my guess would be initializing the car?
// from what I know this gets requested when you save car customization changes
app.put("/personas/:personaId/cars", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;
                if (!fs.existsSync(`./drivers/${file}/carslots.xml`)) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == req.params.personaId) {
                    let carslots = await xmlParser.parseXML(fs.readFileSync(`./drivers/${file}/carslots.xml`).toString());
                    
                    let defaultCarIndex = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];

                    return res.status(200).send(xmlParser.buildXML({
                        OwnedCarTrans: carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex]
                    }));
                }

                drivers += 1;
            }
        }
    }

    res.status(404).end();
});

// Customize Car
app.post("/personas/:personaId/commerce", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;
                if (!fs.existsSync(`./drivers/${file}/carslots.xml`)) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == req.params.personaId) {
                    let carslots = await xmlParser.parseXML(fs.readFileSync(`./drivers/${file}/carslots.xml`).toString());
                    let body = await xmlParser.parseXML(req.body);
                    
                    let defaultCarIndex = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];

                    let car = carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex].CustomCar[0];
                    let newCar = body.CommerceSessionTrans.UpdatedCar[0].CustomCar[0];

                    car.Paints = newCar.Paints;
                    car.PerformanceParts = newCar.PerformanceParts;
                    car.SkillModParts = newCar.SkillModParts;
                    car.Vinyls = newCar.Vinyls;
                    car.VisualParts = newCar.VisualParts;

                    fs.writeFileSync(`./drivers/${file}/carslots.xml`, xmlParser.buildXML(carslots));

                    return res.status(200).send(xmlParser.buildXML({
                        CommerceSessionResultTrans: {
                            Status: ["Success"],
                            UpdatedCar: carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex]
                        }
                    }));
                }

                drivers += 1;
            }
        }
    }

    res.status(404).end();
});

// Get Inventory from Persona
app.get("/personas/inventory/objects", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let file = `./drivers/${global.activeDriver.driver}/objects.xml`;

    if (!global.activeDriver.driver) return res.status(404).send("<EngineError><Message>No active persona</Message></EngineError>");

    if (fs.existsSync(file)) res.send(fs.readFileSync(file).toString());
    else res.status(200).end();
});

// Purchasing (cars, etc...)
app.post("/personas/:personaId/baskets", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    let body = await xmlParser.parseXML(req.body);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;
                if (!fs.existsSync(`./drivers/${file}/carslots.xml`)) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == req.params.personaId) {
                    let basketFile = `./data/basket/${body.BasketTrans.Items[0].BasketItemTrans[0].ProductId[0]}.xml`;

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

                    if (fs.existsSync(basketFile)) {
                        let basket = await xmlParser.parseXML(fs.readFileSync(basketFile).toString());
                        
                        let stanza = xmlParser.getRootName(basket);

                        switch (stanza) {
                            case "OwnedCarTrans":
                                let carslots = await xmlParser.parseXML(fs.readFileSync(`./drivers/${file}/carslots.xml`).toString());

                                let carTemplate = {
                                    CustomCar: basket.OwnedCarTrans.CustomCar,
                                    Durability: ["100"],
                                    Heat: ["1"],
                                    Id: [functions.MakeID()],
                                    OwnershipType: ["CustomizedCar"]
                                }

                                if (!carslots.CarSlotInfoTrans.CarsOwnedByPersona) carslots.CarSlotInfoTrans.CarsOwnedByPersona = [{ OwnedCarTrans: [] }];
                                if (!carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans) carslots.CarSlotInfoTrans.CarsOwnedByPersona = [{ OwnedCarTrans: [] }];

                                let carindex = (carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.push(carTemplate)) - 1;

                                carslots.CarSlotInfoTrans.DefaultOwnedCarIndex = [`${carindex}`];

                                fs.writeFileSync(`./drivers/${file}/carslots.xml`, xmlParser.buildXML(carslots));

                                commerceTemplate.CommerceResultTrans.PurchasedCars = [{ OwnedCarTrans: [carTemplate] }];
                            break;
                        }
                    }

                    return res.status(200).send(xmlParser.buildXML(commerceTemplate));
                }

                drivers += 1;
            }
        }
    }

    res.status(404).end();
});

// Repair Car
app.get("/car/repair", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;
                if (!fs.existsSync(`./drivers/${file}/carslots.xml`)) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == req.query.personaId) {
                    let carslots = await xmlParser.parseXML(fs.readFileSync(`./drivers/${file}/carslots.xml`).toString());
                    
                    let defaultCarIndex = carslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];

                    carslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex].Durability = ["100"];

                    fs.writeFileSync(`./drivers/${file}/carslots.xml`, xmlParser.buildXML(carslots));

                    return res.status(200).send("<int>100</int>");
                }

                drivers += 1;
            }
        }
    }

    res.status(404).end();
});

// Edit Motto
app.post("/DriverPersona/UpdateStatusMessage", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    let body = await xmlParser.parseXML(req.body);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == body.PersonaMotto.personaId[0]) {
                    PersonaInfo.ProfileData.Motto = [];
                    PersonaInfo.ProfileData.Motto[0] = body.PersonaMotto.message[0];

                    fs.writeFileSync(path.join(driversDir, file, "GetPersonaInfo.xml"), xmlParser.buildXML(PersonaInfo));

                    return res.status(200).send(xmlParser.buildXML({
                        PersonaMotto: {
                            message: PersonaInfo.ProfileData.Motto,
                            personaId: PersonaInfo.ProfileData.PersonaId
                        }
                    }));
                }

                drivers += 1;
            }
        }
    }

    res.status(404).end();
});

// Get driver information
app.get("/DriverPersona/GetPersonaInfo", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let file of dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;

                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                if (PersonaInfo.ProfileData.PersonaId[0] == req.query.personaId) {
                    if (global.newDriver && global.newDriver.personaId == req.query.personaId && global.newDriver.numOfReqs < 2) {
                        if (global.newDriver.numOfReqs == 1) PersonaInfo.ProfileData.Level = ["1"];
                        global.newDriver.numOfReqs += 1;
                    }

                    return res.send(xmlParser.buildXML(PersonaInfo));
                }

                drivers += 1;
            }
        } else {
            let filePath = `./data/personas/${req.query.personaId}/GetPersonaInfo.xml`;

            if (fs.existsSync(filePath)) {
                return res.send(fs.readFileSync(filePath).toString());
            }
        }
    }

    res.status(200).end();
});

// Get base driver information
app.post("/DriverPersona/GetPersonaBaseFromList", compression({ threshold: 0 }), async (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");

    let dirFiles = fs.readdirSync(driversDir);

    let baseTemplate = {
        ArrayOfPersonaBase: {
            PersonaBase: []
        }
    }

    let body = await xmlParser.parseXML(req.body);

    for (let x in body.PersonaIdArray.PersonaIds) {
        let drivers = 0;

        for (let file of dirFiles) {
            if (drivers < 3) {
                if (fs.statSync(path.join(driversDir, file)).isDirectory() && file.startsWith("driver") && Number(file.replace("driver", ""))) {
                    if (!fs.existsSync(path.join(driversDir, file, "GetPersonaInfo.xml"))) continue;

                    let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driversDir, file, "GetPersonaInfo.xml")).toString());

                    if (PersonaInfo.ProfileData.PersonaId[0] == body.PersonaIdArray.PersonaIds[0]["array:long"][x]) {
                        baseTemplate.ArrayOfPersonaBase.PersonaBase.push({ Presence: ["1"], UserId: ["1"], ...PersonaInfo.ProfileData});
                    }

                    drivers += 1;
                }
            } else {
                let filePath = `./data/personas/${body.PersonaIdArray.PersonaIds[0]["array:long"][x]}/GetPersonaBase.xml`;
                let otherPath = `./data/personas/${body.PersonaIdArray.PersonaIds[0]["array:long"][x]}/GetPersonaBaseFromList.xml`;

                if (fs.existsSync(filePath)) {
                    let fileRead = await xmlParser.parseXML(fs.readFileSync(filePath).toString());

                    baseTemplate.ArrayOfPersonaBase.PersonaBase = baseTemplate.ArrayOfPersonaBase.PersonaBase.concat(fileRead.ArrayOfPersonaBase.PersonaBase);
                }

                if (fs.existsSync(otherPath)) {
                    let otherFileRead = await xmlParser.parseXML(fs.readFileSync(otherPath).toString());

                    baseTemplate.ArrayOfPersonaBase.PersonaBase = baseTemplate.ArrayOfPersonaBase.PersonaBase.concat(otherFileRead.ArrayOfPersonaBase.PersonaBase);
                }
            }
        }
    }

    res.status(200).send(xmlParser.buildXML(baseTemplate));
});

module.exports = app;