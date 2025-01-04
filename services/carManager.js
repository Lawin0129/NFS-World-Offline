const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const functions = require("../utils/functions");
const personaManager = require("./personaManager");

let self = module.exports = {
    getCarslots: async (personaId) => {
        const findPersona = await personaManager.getPersonaById(personaId);
        
        if (findPersona.success) {
            let carslotsPath = path.join(findPersona.data.driverDirectory, "carslots.xml");
            let carslots = fs.readFileSync(carslotsPath).toString();
            
            return functions.createResponse(true, {
                carslotsPath: carslotsPath,
                carslotsData: carslots
            });
        }

        return functions.createResponse(false, {});
    },
    getCars: async (personaId) => {
        const getCarslots = await self.getCarslots(personaId);
        
        if (getCarslots.success) {
            let carsTemplate = {
                ArrayOfOwnedCarTrans: {
                    OwnedCarTrans: []
                }
            }
            
            let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
            
            if (!parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona) {
                parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona = [{ OwnedCarTrans: [] }];
            }
            
            carsTemplate.ArrayOfOwnedCarTrans = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0];
            
            return functions.createResponse(true, carsTemplate);
        }

        return functions.createResponse(false, {});
    },
    getDefaultCar: async (personaId) => {
        const getCarslots = await self.getCarslots(personaId);
        
        if (getCarslots.success) {
            let defaultCar = {
                OwnedCarTrans: {
                    Durability: ["0"],
                    Heat: ["0.0"],
                    Id: ["0"]
                }
            }
            
            let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
            
            let defaultIndex = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex?.[0];
            let defaultItem = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona?.[0]?.OwnedCarTrans?.[defaultIndex];
            
            if (defaultItem) defaultCar.OwnedCarTrans = defaultItem;
            
            return functions.createResponse(true, defaultCar);
        }
        
        return functions.createResponse(false, {});
    },
    setDefaultCar: async (personaId, carId) => {
        const getCarslots = await self.getCarslots(personaId);
        
        if (getCarslots.success) {
            let carslotsPath = getCarslots.data.carslotsPath;
            let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
            
            let findCarIndex = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.findIndex(i => (i.Id[0] == carId));
            
            if (findCarIndex >= 0) {
                parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex = [`${findCarIndex}`];
                
                fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots));

                return functions.createResponse(true, {});
            }
        }

        return functions.createResponse(false, {});
    },
    repairDefaultCar: async (personaId) => {
        const getCarslots = await self.getCarslots(personaId);
        
        if (getCarslots.success) {
            let carslotsPath = getCarslots.data.carslotsPath;
            let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
            
            let defaultCarIndex = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
            
            parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex].Durability = ["100"];
            
            fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots));

            return functions.createResponse(true, {});
        }

        return functions.createResponse(false, {});
    },
    saveCar: async (personaId, updatedCar) => {
        const getCarslots = await self.getCarslots(personaId);
        
        if (getCarslots.success) {
            let carslotsPath = getCarslots.data.carslotsPath;
            let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
            
            let defaultCarIndex = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
            let defaultCar = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex].CustomCar[0];
            
            defaultCar.Paints = updatedCar.Paints;
            defaultCar.PerformanceParts = updatedCar.PerformanceParts;
            defaultCar.SkillModParts = updatedCar.SkillModParts;
            defaultCar.Vinyls = updatedCar.Vinyls;
            defaultCar.VisualParts = updatedCar.VisualParts;
            
            fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots));
            
            return functions.createResponse(true, parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex]);
        }

        return functions.createResponse(false, {});
    },
    addCar: async (personaId, ownedCarTrans) => {
        const getCarslots = await self.getCarslots(personaId);
        
        if (getCarslots.success) {
            let carslotsPath = getCarslots.data.carslotsPath;
            let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
            
            let carTemplate = {
                CustomCar: ownedCarTrans.CustomCar,
                Durability: ["100"],
                Heat: ["1"],
                Id: [functions.MakeID()],
                OwnershipType: ["CustomizedCar"]
            }

            let CarSlotInfoTrans = parsedCarslots.CarSlotInfoTrans;
            
            if (!(CarSlotInfoTrans.CarsOwnedByPersona?.[0]?.OwnedCarTrans)) {
                CarSlotInfoTrans.CarsOwnedByPersona = [{ OwnedCarTrans: [] }];
            }
            
            let newCarIdx = (CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.push(carTemplate)) - 1;
            
            CarSlotInfoTrans.DefaultOwnedCarIndex = [`${newCarIdx}`];
            
            fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots));

            return functions.createResponse(true, carTemplate);
        }

        return functions.createResponse(false, {});
    },
    sellCar: async (personaId, carId) => {
        const getCarslots = await self.getCarslots(personaId);
        
        if (getCarslots.success) {
            let carslotsPath = getCarslots.data.carslotsPath;
            let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);

            let ownedCars = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0];
            
            if (ownedCars.OwnedCarTrans.length > 1) {
                let findCarIndex = ownedCars.OwnedCarTrans.findIndex(i => (i.Id[0] == carId));
                
                if (findCarIndex >= 0) {
                    ownedCars.OwnedCarTrans.splice(findCarIndex, 1);
                    
                    let defaultIdx = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
                    
                    if (!(ownedCars.OwnedCarTrans[defaultIdx])) {
                        defaultIdx = (ownedCars.OwnedCarTrans.length - 1);

                        parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex = [`${defaultIdx}`];
                    }
                    
                    fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots));
                    
                    return functions.createResponse(true, {
                        OwnedCarTrans: ownedCars.OwnedCarTrans[defaultIdx]
                    });
                }
            }
        }

        return functions.createResponse(false, {});
    }
}