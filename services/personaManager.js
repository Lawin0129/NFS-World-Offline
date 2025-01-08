const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");
const functions = require("../utils/functions");

let personaFiles = [
    "GetPersonaInfo.xml",
    "carslots.xml",
    "gettreasurehunteventsession.xml",
    "loadall.xml",
    "objects.xml"
];

let self = module.exports = {
    getPersonas: async (personaIds) => {
        let driversDir = path.join(__dirname, "..", "drivers");

        let driverIdx = 0;
        let drivers = [];
        
        for (let file of fs.readdirSync(driversDir)) {
            if (driverIdx >= 3) break;

            let driverDirectory = path.join(driversDir, file);
            
            if ((fs.statSync(driverDirectory).isDirectory()) && (file.startsWith("driver")) && (!Number.isNaN(Number(file.replace("driver", ""))))) {
                let filesInDriver = fs.readdirSync(driverDirectory);
                if (!personaFiles.every(fileName => filesInDriver.includes(fileName))) continue;
                
                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driverDirectory, "GetPersonaInfo.xml")).toString());

                if ((Array.isArray(personaIds)) && (!personaIds.includes(PersonaInfo.ProfileData.PersonaId[0]))) {
                    driverIdx += 1;
                    continue;
                }
                
                drivers.push({
                    personaInfo: PersonaInfo.ProfileData,
                    personaId: PersonaInfo.ProfileData.PersonaId[0],
                    personaName: PersonaInfo.ProfileData.Name[0],
                    driverIdx: driverIdx,
                    driverDirectory: driverDirectory
                });

                if ((Array.isArray(personaIds)) && (drivers.length == personaIds.length)) break;
                
                driverIdx += 1;
            }
        }
        
        return drivers;
    },
    getPersonaById: async (personaId) => {
        const findPersona = await self.getPersonas([personaId]);

        if (findPersona.length == 1) {
            return functions.createResponse(true, findPersona[0]);
        }
        
        return functions.createResponse(false, {});
    },
    getPersonaByName: async (personaName) => {
        let driversDir = path.join(__dirname, "..", "drivers");

        let driverIdx = 0;
        
        for (let file of fs.readdirSync(driversDir)) {
            if (driverIdx >= 3) break;

            let driverDirectory = path.join(driversDir, file);
            
            if ((fs.statSync(driverDirectory).isDirectory()) && (file.startsWith("driver")) && (!Number.isNaN(Number(file.replace("driver", ""))))) {
                let filesInDriver = fs.readdirSync(driverDirectory);
                if (!personaFiles.every(fileName => filesInDriver.includes(fileName))) continue;
                
                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driverDirectory, "GetPersonaInfo.xml")).toString());
                
                if (personaName == PersonaInfo.ProfileData.Name[0]) {
                    return functions.createResponse(true, {
                        personaInfo: PersonaInfo.ProfileData,
                        personaId: PersonaInfo.ProfileData.PersonaId[0],
                        personaName: PersonaInfo.ProfileData.Name[0],
                        driverIdx: driverIdx,
                        driverDirectory: driverDirectory
                    });
                }
                
                driverIdx += 1;
            }
        }
        
        return functions.createResponse(false, {});
    },
    getActivePersona: () => {
        if (global.activeDriver.driver.length != 0) {
            return functions.createResponse(true, global.activeDriver);
        }
        
        return functions.createResponse(false, "<EngineError><Message>No active persona</Message></EngineError>");
    },
    setActivePersona: async (personaId) => {
        const findPersona = await self.getPersonaById(personaId);

        if (findPersona.success) {
            global.activeDriver = {
                driverDirectory: findPersona.data.driverDirectory,
                driver: path.basename(findPersona.data.driverDirectory),
                personaId: findPersona.data.personaId
            }

            fs.writeFileSync(path.join(__dirname, "..", "drivers", "DefaultPersonaIdx.xml"), `<UserInfo><defaultPersonaIdx>${findPersona.data.driverIdx}</defaultPersonaIdx></UserInfo>`);

            return functions.createResponse(true, {});
        }

        return functions.createResponse(false, {});
    },
    removeActivePersona: () => {
        global.activeDriver = { driverDirectory: "", driver: "", personaId: "" };

        return functions.createResponse(true, {});
    },
    setMotto: async (personaId, motto) => {
        const findPersona = await self.getPersonaById(personaId);

        if (findPersona.success) {
            let personaInfo = findPersona.data.personaInfo;

            personaInfo.Motto = [motto];
            
            fs.writeFileSync(path.join(findPersona.data.driverDirectory, "GetPersonaInfo.xml"), xmlParser.buildXML({ ProfileData: personaInfo }));

            return functions.createResponse(true, {});
        }

        return functions.createResponse(false, {});
    },
    createPersona: async (personaName, iconIndex) => {
        let checkNameTaken = await self.getPersonaByName(personaName);

        if ((!checkNameTaken.success) && (personaName.length >= 3) && (personaName.length <= 14)) {
            let newPersonaId = functions.MakeID();
            let driverFolderName;

            let configDirectory = path.join(__dirname, "..", "Config", "DriverTemplate");
            let driverDirectory = path.join(__dirname, "..", "drivers");
            
            if (!fs.existsSync(path.join(driverDirectory, "driver1"))) driverFolderName = "driver1";
            else if (!fs.existsSync(path.join(driverDirectory, "driver2"))) driverFolderName = "driver2";
            else if (!fs.existsSync(path.join(driverDirectory, "driver3"))) driverFolderName = "driver3";
            
            let driverPath = path.join(driverDirectory, driverFolderName);
            
            if ((typeof driverFolderName) == "string") {
                fs.mkdirSync(driverPath);

                let carslots = fs.readFileSync(path.join(configDirectory, "carslots.xml")).toString();
                let GetPersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(configDirectory, "GetPersonaInfo.xml")).toString());
                let gettreasurehunteventsession = fs.readFileSync(path.join(configDirectory, "gettreasurehunteventsession.xml")).toString();
                let loadall = await xmlParser.parseXML(fs.readFileSync(path.join(configDirectory, "loadall.xml")).toString());
                let objects = fs.readFileSync(path.join(configDirectory, "objects.xml")).toString();
                
                GetPersonaInfo.ProfileData.IconIndex = [iconIndex];
                GetPersonaInfo.ProfileData.Name = [personaName];
                GetPersonaInfo.ProfileData.PersonaId = [newPersonaId];
                loadall.AchievementsPacket.PersonaId = [newPersonaId];
                
                loadall = xmlParser.buildXML(loadall);
                
                fs.writeFileSync(path.join(driverPath, "carslots.xml"), carslots);
                fs.writeFileSync(path.join(driverPath, "GetPersonaInfo.xml"), xmlParser.buildXML(GetPersonaInfo));
                fs.writeFileSync(path.join(driverPath, "gettreasurehunteventsession.xml"), gettreasurehunteventsession);
                fs.writeFileSync(path.join(driverPath, "loadall.xml"), loadall);
                fs.writeFileSync(path.join(driverPath, "objects.xml"), objects);
                
                return functions.createResponse(true, GetPersonaInfo);
            }
        }

        return functions.createResponse(false, {});
    },
    deletePersona: async (personaId) => {
        let findPersona = await self.getPersonaById(personaId);
        if (findPersona.success == false) return functions.createResponse(false, {});
        
        fs.rmSync(findPersona.data.driverDirectory, { recursive: true });
        fs.writeFileSync(path.join(__dirname, "..", "drivers", "DefaultPersonaIdx.xml"), "<UserInfo><defaultPersonaIdx>0</defaultPersonaIdx></UserInfo>");

        return functions.createResponse(true, {});
    }
}