const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const functions = require("../utils/functions");
const response = require("../utils/response");
const error = require("../utils/error");
const personaManager = require("./personaManager");
const allCatalogProducts = require("../../config/Assets/catalog.json");

let self = module.exports = {
    getCarslots: async (personaId) => {
        const findPersona = await personaManager.getPersonaById(personaId);
        if (!findPersona.success) return error.personaNotFound();
        
        const carslotsPath = path.join(findPersona.data.driverDirectory, "carslots.xml");
        
        return response.createSuccess({
            carslotsData: fs.readFileSync(carslotsPath).toString(),
            carslotsPath: carslotsPath,
            persona: findPersona.data
        });
    },
    getDefaultCar: async (personaId) => {
        const getCarslots = await self.getCarslots(personaId);
        if (!getCarslots.success) return error.personaNotFound();
        
        let defaultCar = {
            OwnedCarTrans: {
                Durability: ["0"],
                Heat: ["0.0"],
                Id: ["0"]
            }
        };
        
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
        
        let defaultIndex = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex?.[0];
        let defaultItem = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona?.[0]?.OwnedCarTrans?.[defaultIndex];
        
        if (defaultItem) defaultCar.OwnedCarTrans = defaultItem;
        
        return response.createSuccess(defaultCar);
    },
    setDefaultCar: async (personaId, carId) => {
        if ((typeof carId) != "string") return error.invalidParameters();
        
        const getCarslots = await self.getCarslots(personaId);
        if (!getCarslots.success) return error.personaNotFound();
        
        let carslotsPath = getCarslots.data.carslotsPath;
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
        
        let findCarIndex = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.findIndex(car => car.Id?.[0] == carId);
        if (findCarIndex == -1) return error.carNotFound();
        
        parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex = [`${findCarIndex}`];
        
        fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));
        
        return response.createSuccess();
    },
    repairDefaultCar: async (personaId) => {
        const getCarslots = await self.getCarslots(personaId);
        if (!getCarslots.success) return error.personaNotFound();
        
        let carslotsPath = getCarslots.data.carslotsPath;
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
        
        let defaultCarIndex = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
        
        parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex].Durability = ["100"];
        
        fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));
        
        return response.createSuccess();
    },
    saveCar: async (personaId, updatedCustomCar) => {
        if ((typeof updatedCustomCar) != "object") return error.invalidParameters();

        const getCarslots = await self.getCarslots(personaId);
        if (!getCarslots.success) return error.personaNotFound();
        
        let carslotsPath = getCarslots.data.carslotsPath;
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
        
        let defaultCarIndex = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
        let defaultCustomCar = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex].CustomCar[0];

        const oldPerfParts = defaultCustomCar.PerformanceParts?.[0]?.PerformancePartTrans;
        const newPerfParts = updatedCustomCar.PerformanceParts?.[0]?.PerformancePartTrans;

        const oldSkillParts = defaultCustomCar.SkillModParts?.[0]?.SkillModPartTrans;
        const newSkillParts = updatedCustomCar.SkillModParts?.[0]?.SkillModPartTrans;

        const extractPartHashes = (parts, attribName) => {
            let partsList = [];

            if (Array.isArray(parts)) {
                for (let idx = 0; parts.length > idx; idx++) {
                    let partHash = parts[idx]?.[attribName]?.[0];
                    if ((typeof partHash) != "string") partHash = "";

                    partsList.push(partHash);
                }
            }

            return partsList;
        }

        const oldPerfPartsHashes = extractPartHashes(oldPerfParts, "PerformancePartAttribHash");
        const newPerfPartsHashes = extractPartHashes(newPerfParts, "PerformancePartAttribHash");

        const oldSkillPartsHashes = extractPartHashes(oldSkillParts, "SkillModPartAttribHash");
        const newSkillPartsHashes = extractPartHashes(newSkillParts, "SkillModPartAttribHash");

        const perfDiff = functions.diffArrays(oldPerfPartsHashes, newPerfPartsHashes).filter(i => i[1] < 0);
        const skillDiff = functions.diffArrays(oldSkillPartsHashes, newSkillPartsHashes).filter(i => i[1] < 0);

        let cashChange = 0;

        for (let perfRemoval of perfDiff) {
            if (!perfRemoval[0]) continue;

            const productData = allCatalogProducts.find(p => p.hash == perfRemoval[0]);

            if (productData) {
                cashChange += productData.resalePrice;
            }
        }

        for (let skillRemoval of skillDiff) {
            if (!skillRemoval[0]) continue;

            let soldPartHash = skillRemoval[0];
            let amountSold = skillRemoval[1] * -1;

            const productData = allCatalogProducts.find(p => p.hash == soldPartHash);

            if (productData) {
                cashChange += (productData.resalePrice * amountSold);
            }
        }

        if (cashChange != 0) await personaManager.addCash(personaId, cashChange);
        
        defaultCustomCar.Paints = updatedCustomCar.Paints;
        defaultCustomCar.PerformanceParts = updatedCustomCar.PerformanceParts;
        defaultCustomCar.SkillModParts = updatedCustomCar.SkillModParts;
        defaultCustomCar.Vinyls = updatedCustomCar.Vinyls;
        defaultCustomCar.VisualParts = updatedCustomCar.VisualParts;
        
        fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));
        
        return response.createSuccess(parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex]);
    },
    addCar: async (personaId, ownedCarTrans) => {
        if ((typeof ownedCarTrans) != "object") return error.invalidParameters();

        const getCarslots = await self.getCarslots(personaId);
        if (!getCarslots.success) return error.personaNotFound();
        
        let carslotsPath = getCarslots.data.carslotsPath;
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
        
        let carTemplate = {
            CustomCar: ownedCarTrans.CustomCar,
            Durability: ["100"],
            Heat: ["1"],
            Id: [functions.MakeID()],
            OwnershipType: ["CustomizedCar"]
        };
        
        let CarSlotInfoTrans = parsedCarslots.CarSlotInfoTrans;
        
        if (!CarSlotInfoTrans.CarsOwnedByPersona?.[0]?.OwnedCarTrans) {
            CarSlotInfoTrans.CarsOwnedByPersona = [{ OwnedCarTrans: [] }];
        }
        
        let newCarIdx = (CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.push(carTemplate)) - 1;
        
        CarSlotInfoTrans.DefaultOwnedCarIndex = [`${newCarIdx}`];
        
        fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));
        
        return response.createSuccess(carTemplate);
    },
    sellCar: async (personaId, carId) => {
        if ((typeof carId) != "string") return error.invalidParameters();

        const getCarslots = await self.getCarslots(personaId);
        if (!getCarslots.success) return error.personaNotFound();
        
        let carslotsPath = getCarslots.data.carslotsPath;
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
        
        let ownedCars = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0];
        if (ownedCars.OwnedCarTrans.length <= 1) return error.insufficientCarsOwned();
        
        let findCarIndex = ownedCars.OwnedCarTrans.findIndex(car => car.Id?.[0] == carId);
        if (findCarIndex == -1) return error.carNotFound();

        const currentCar = ownedCars.OwnedCarTrans[findCarIndex];
        const resalePrice = parseInt(currentCar.CustomCar?.[0]?.ResalePrice?.[0]) || 0;

        await personaManager.addCash(getCarslots.data.persona.personaId, resalePrice);
        
        ownedCars.OwnedCarTrans.splice(findCarIndex, 1);
        
        let defaultIdx = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex[0];
        
        if (!ownedCars.OwnedCarTrans[defaultIdx]) {
            defaultIdx = (ownedCars.OwnedCarTrans.length - 1);

            parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex = [`${defaultIdx}`];
        }
        
        fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));
        
        return response.createSuccess({
            OwnedCarTrans: ownedCars.OwnedCarTrans[defaultIdx]
        });
    }
}
