const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const functions = require("../utils/functions");
const response = require("../utils/response");
const error = require("../utils/error");
const personaManager = require("./personaManager");
const inventoryManager = require("./inventoryManager");
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
        if (updatedCustomCar == null) return error.invalidParameters();

        const getCarslots = await self.getCarslots(personaId);
        if (!getCarslots.success) return error.personaNotFound();
        
        let carslotsPath = getCarslots.data.carslotsPath;
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
        
        let defaultCarIndex = parsedCarslots.CarSlotInfoTrans.DefaultOwnedCarIndex?.[0];
        let defaultCustomCar = parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona?.[0]?.OwnedCarTrans?.[defaultCarIndex]?.CustomCar?.[0];

        if (!defaultCustomCar) return error.invalidParameters();

        const paintMaxSlots = 8;
        const perfPartsMaxSlots = 7;
        const skillPartsMaxSlots = parseInt(defaultCustomCar.SkillModSlotCount?.[0]) || 0;
        const vinylsMaxSlots = 100;
        const visualPartsMaxSlots = 8;

        let paintsTemplate = [{
            CustomPaintTrans: []
        }];

        let perfPartsTemplate = [{
            PerformancePartTrans: []
        }];

        let skillPartsTemplate = [{
            SkillModPartTrans: []
        }];

        let vinylsTemplate = [{
            CustomVinylTrans: []
        }];

        let visualPartsTemplate = [{
            VisualPartTrans: []
        }];

        if (Array.isArray(updatedCustomCar.Paints?.[0]?.CustomPaintTrans)) {
            let slotIteration = 0;

            for (let customPaint of updatedCustomCar.Paints[0].CustomPaintTrans) {
                slotIteration += 1;

                if (slotIteration > paintMaxSlots) break;

                let groupValue = parseInt(customPaint.Group?.[0]) || 0;
                let hueValue = parseInt(customPaint.Hue?.[0]) || 0;
                let satValue = parseInt(customPaint.Sat?.[0]) || 0;
                let slotValue = parseInt(customPaint.Slot?.[0]) || 0;
                let varValue = parseInt(customPaint.Var?.[0]) || 0;

                if (paintsTemplate[0].CustomPaintTrans.some(p => p.Slot[0] == slotValue)) continue;
                
                paintsTemplate[0].CustomPaintTrans.push({
                    Group: [`${groupValue}`],
                    Hue: [`${hueValue}`],
                    Sat: [`${satValue}`],
                    Slot: [`${slotValue}`],
                    Var: [`${varValue}`]
                });
            }
        }

        if (Array.isArray(updatedCustomCar.PerformanceParts?.[0]?.PerformancePartTrans)) {
            let slotIteration = 0;

            for (let perfPart of updatedCustomCar.PerformanceParts[0].PerformancePartTrans) {
                slotIteration += 1;

                if (slotIteration > perfPartsMaxSlots) break;

                let itemHash = (parseInt(perfPart.PerformancePartAttribHash?.[0]) || 0) | 0;

                if (!itemHash) continue;
                if (perfPartsTemplate[0].PerformancePartTrans.some(p => p.PerformancePartAttribHash[0] == itemHash)) continue;

                perfPartsTemplate[0].PerformancePartTrans.push({
                    PerformancePartAttribHash: [`${itemHash}`]
                });
            }
        }

        if (Array.isArray(updatedCustomCar.VisualParts?.[0]?.VisualPartTrans)) {
            let slotIteration = 0;

            for (let visualPart of updatedCustomCar.VisualParts[0].VisualPartTrans) {
                slotIteration += 1;

                if (slotIteration > visualPartsMaxSlots) break;

                let itemHash = (parseInt(visualPart.PartHash?.[0]) || 0) | 0;
                let slotHash = (parseInt(visualPart.SlotHash?.[0]) || 0) | 0;

                if (!itemHash || !slotHash) continue;
                if (visualPartsTemplate[0].VisualPartTrans.some(p => p.PartHash[0] == itemHash)) continue;
                if (visualPartsTemplate[0].VisualPartTrans.some(p => p.SlotHash[0] == slotHash)) continue;

                visualPartsTemplate[0].VisualPartTrans.push({
                    PartHash: [`${itemHash}`],
                    SlotHash: [`${slotHash}`]
                });
            }
        }

        if (Array.isArray(updatedCustomCar.SkillModParts?.[0]?.SkillModPartTrans)) {
            let slotIteration = 0;

            for (let skillPart of updatedCustomCar.SkillModParts[0].SkillModPartTrans) {
                slotIteration += 1;

                if (slotIteration > skillPartsMaxSlots) break;

                let itemHash = (parseInt(skillPart.SkillModPartAttribHash?.[0]) || 0) | 0;
                let isFixed = skillPart.IsFixed?.[0]?.toLowerCase?.() == "true";

                if (!itemHash) continue;

                skillPartsTemplate[0].SkillModPartTrans.push({
                    IsFixed: [`${isFixed}`],
                    SkillModPartAttribHash: [`${itemHash}`]
                });
            }
        }

        if (Array.isArray(updatedCustomCar.Vinyls?.[0]?.CustomVinylTrans)) {
            let slotIteration = 0;

            for (let customVinyl of updatedCustomCar.Vinyls[0].CustomVinylTrans) {
                slotIteration += 1;

                if (slotIteration > vinylsMaxSlots) break;

                let itemHash = (parseInt(customVinyl.Hash?.[0]) || 0) | 0;
                if (!itemHash) continue;

                let hue1Value = parseInt(customVinyl.Hue1?.[0]) || 0;
                let hue2Value = parseInt(customVinyl.Hue2?.[0]) || 0;
                let hue3Value = parseInt(customVinyl.Hue3?.[0]) || 0;
                let hue4Value = parseInt(customVinyl.Hue4?.[0]) || 0;
                let layerValue = parseInt(customVinyl.Layer?.[0]) || 0;
                let mirValue = customVinyl.Mir?.[0]?.toLowerCase?.() == "true";
                let rotValue = parseInt(customVinyl.Rot?.[0]) || 0;
                let sat1Value = parseInt(customVinyl.Sat1?.[0]) || 0;
                let sat2Value = parseInt(customVinyl.Sat2?.[0]) || 0;
                let sat3Value = parseInt(customVinyl.Sat3?.[0]) || 0;
                let sat4Value = parseInt(customVinyl.Sat4?.[0]) || 0;
                let scaleXValue = parseInt(customVinyl.ScaleX?.[0]) || 0;
                let scaleYValue = parseInt(customVinyl.ScaleY?.[0]) || 0;
                let shearValue = parseInt(customVinyl.Shear?.[0]) || 0;
                let tranXValue = parseInt(customVinyl.TranX?.[0]) || 0;
                let tranYValue = parseInt(customVinyl.TranY?.[0]) || 0;
                let var1Value = parseInt(customVinyl.Var1?.[0]) || 0;
                let var2Value = parseInt(customVinyl.Var2?.[0]) || 0;
                let var3Value = parseInt(customVinyl.Var3?.[0]) || 0;
                let var4Value = parseInt(customVinyl.Var4?.[0]) || 0;
                
                vinylsTemplate[0].CustomVinylTrans.push({
                    Hash: [`${itemHash}`],
                    Hue1: [`${hue1Value}`],
                    Hue2: [`${hue2Value}`],
                    Hue3: [`${hue3Value}`],
                    Hue4: [`${hue4Value}`],
                    Layer: [`${layerValue}`],
                    Mir: [`${mirValue}`],
                    Rot: [`${rotValue}`],
                    Sat1: [`${sat1Value}`],
                    Sat2: [`${sat2Value}`],
                    Sat3: [`${sat3Value}`],
                    Sat4: [`${sat4Value}`],
                    ScaleX: [`${scaleXValue}`],
                    ScaleY: [`${scaleYValue}`],
                    Shear: [`${shearValue}`],
                    TranX: [`${tranXValue}`],
                    TranY: [`${tranYValue}`],
                    Var1: [`${var1Value}`],
                    Var2: [`${var2Value}`],
                    Var3: [`${var3Value}`],
                    Var4: [`${var4Value}`]
                });
            }
        }

        const oldPerfParts = defaultCustomCar.PerformanceParts?.[0]?.PerformancePartTrans;
        const newPerfParts = perfPartsTemplate[0].PerformancePartTrans;

        const oldSkillParts = defaultCustomCar.SkillModParts?.[0]?.SkillModPartTrans;
        const newSkillParts = skillPartsTemplate[0].SkillModPartTrans;

        const oldVisualParts = defaultCustomCar.VisualParts?.[0]?.VisualPartTrans;
        const newVisualParts = visualPartsTemplate[0].VisualPartTrans;

        const oldVinyls = defaultCustomCar.Vinyls?.[0]?.CustomVinylTrans;
        const newVinyls = vinylsTemplate[0].CustomVinylTrans;

        const extractPartHashes = (parts, attribName) => {
            let partsList = [];

            if (Array.isArray(parts)) {
                for (let idx = 0; parts.length > idx; idx++) {
                    let partHash = (parseInt(parts[idx]?.[attribName]?.[0]) || 0) | 0;
                    if (!partHash) partHash = "";

                    partsList.push(`${partHash}`);
                }
            }

            return partsList;
        }

        const oldPerfPartsHashes = extractPartHashes(oldPerfParts, "PerformancePartAttribHash");
        const newPerfPartsHashes = extractPartHashes(newPerfParts, "PerformancePartAttribHash");

        const oldSkillPartsHashes = extractPartHashes(oldSkillParts, "SkillModPartAttribHash");
        const newSkillPartsHashes = extractPartHashes(newSkillParts, "SkillModPartAttribHash");

        const oldVisualPartsHashes = extractPartHashes(oldVisualParts, "PartHash");
        const newVisualPartsHashes = extractPartHashes(newVisualParts, "PartHash");

        const oldVinylHashes = extractPartHashes(oldVinyls, "Hash");
        const newVinylHashes = extractPartHashes(newVinyls, "Hash");

        const perfDiff = functions.diffArrays(oldPerfPartsHashes, newPerfPartsHashes);
        const skillDiff = functions.diffArrays(oldSkillPartsHashes, newSkillPartsHashes);
        const visualDiff = functions.diffArrays(oldVisualPartsHashes, newVisualPartsHashes);
        const vinylDiff = functions.diffArrays(oldVinylHashes, newVinylHashes);

        let cashChange = 0;
        let useParts = [];

        const processPartDiffs = (partDiff, itemType) => {
            for (let partChange of partDiff) {
                let partHash = partChange[0];
                let itemAmount = partChange[1];

                if (!partHash) continue;

                if (itemAmount >= 1) {
                    for (let i = 0; i < itemAmount; i++) {
                        useParts.push({
                            itemHash: partHash,
                            itemType: itemType
                        });
                    }
                } else {
                    const productData = allCatalogProducts.find(p => p.hash == partHash);
                    
                    if (productData) {
                        cashChange += (productData.resalePrice * (itemAmount * -1));
                    }
                }
            }
        }

        processPartDiffs(perfDiff, "performancepart");
        processPartDiffs(skillDiff, "skillmodpart");
        processPartDiffs(visualDiff, "visualpart");
        processPartDiffs(vinylDiff, "vinyl");

        if (useParts.length != 0) {
            const useInventoryParts = await inventoryManager.useInventoryItems(personaId, useParts);

            if (useInventoryParts.data.failedToApply) {
                return error.partApplyFail();
            }
        }

        if (cashChange != 0) await personaManager.addCash(personaId, cashChange);
        
        defaultCustomCar.Paints = paintsTemplate;
        defaultCustomCar.PerformanceParts = perfPartsTemplate;
        defaultCustomCar.SkillModParts = skillPartsTemplate;
        defaultCustomCar.Vinyls = vinylsTemplate;
        defaultCustomCar.VisualParts = visualPartsTemplate;
        
        fs.writeFileSync(carslotsPath, xmlParser.buildXML(parsedCarslots, { pretty: true }));
        
        return response.createSuccess(parsedCarslots.CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans[defaultCarIndex]);
    },
    addCar: async (personaId, ownedCarTrans, customFields) => {
        if ((typeof ownedCarTrans) != "object") return error.invalidParameters();

        const getCarslots = await self.getCarslots(personaId);
        if (!getCarslots.success) return error.personaNotFound();
        
        let carslotsPath = getCarslots.data.carslotsPath;
        let parsedCarslots = await xmlParser.parseXML(getCarslots.data.carslotsData);
        let CarSlotInfoTrans = parsedCarslots.CarSlotInfoTrans;

        if (!CarSlotInfoTrans.CarsOwnedByPersona?.[0]?.OwnedCarTrans) {
            CarSlotInfoTrans.CarsOwnedByPersona = [{ OwnedCarTrans: [] }];
        }

        let carId = functions.MakeID();

        while (CarSlotInfoTrans.CarsOwnedByPersona[0].OwnedCarTrans.some(c => c.Id?.[0] == carId)) {
            carId = functions.MakeID();
        }
        
        let carTemplate = {
            CustomCar: ownedCarTrans.CustomCar,
            Durability: ["100"],
            Heat: ["1"],
            Id: [carId],
            OwnershipType: ["CustomizedCar"]
        };

        for (let field of Object.keys(customFields)) {
            carTemplate.CustomCar[0][field] = customFields[field];
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
