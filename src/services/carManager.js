const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const functions = require("../utils/functions");
const response = require("../utils/response");
const error = require("../utils/error");
const personaManager = require("./personaManager");

let self = module.exports = {
    getCarslots: async (personaId) => {
        const findPersona = await personaManager.getPersonaById(personaId);
        if (!findPersona.success) return error.personaNotFound();
        
        const carslotsPath = path.join(findPersona.data.driverDirectory, "carslots.xml");
        
        return response.createSuccess({
            carslotsData: fs.readFileSync(carslotsPath).toString(),
            carslotsPath: carslotsPath
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
