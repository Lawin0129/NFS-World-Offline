const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
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
        let driversDir = paths.driversPath;

        let driverIdx = 0;
        let drivers = [];
        
        for (let file of fs.readdirSync(driversDir)) {
            if (driverIdx >= 3) break;

            let driverDirectory = path.join(driversDir, file);
            
            if ((file.startsWith("driver")) && (!Number.isNaN(Number(file.replace("driver", "")))) && (fs.statSync(driverDirectory).isDirectory())) {
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
        let driversDir = paths.driversPath;

        let driverIdx = 0;
        
        for (let file of fs.readdirSync(driversDir)) {
            if (driverIdx >= 3) break;

            let driverDirectory = path.join(driversDir, file);
            
            if ((file.startsWith("driver")) && (!Number.isNaN(Number(file.replace("driver", "")))) && (fs.statSync(driverDirectory).isDirectory())) {
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
    removeActivePersona: () => {
        global.activeDriver = { driverDirectory: "", driver: "", personaId: "" };
        global.xmppClientData?.secureSocket?.destroy?.();
        delete global.xmppClientData;

        return functions.createResponse(true, {});
    },
    setActivePersona: async (personaId) => {
        self.removeActivePersona();
        
        const findPersona = await self.getPersonaById(personaId);

        if (findPersona.success) {
            global.activeDriver = {
                driverDirectory: findPersona.data.driverDirectory,
                driver: path.basename(findPersona.data.driverDirectory),
                personaId: findPersona.data.personaId
            };

            fs.writeFileSync(path.join(paths.driversPath, "DefaultPersonaIdx.xml"), `<UserInfo><defaultPersonaIdx>${findPersona.data.driverIdx}</defaultPersonaIdx></UserInfo>`);

            return functions.createResponse(true, {});
        }

        return functions.createResponse(false, {});
    },
    setMotto: async (personaId, motto) => {
        const findPersona = await self.getPersonaById(personaId);

        if ((findPersona.success) && ((typeof motto) == "string") && (motto.length <= 60)) {
            let personaInfo = findPersona.data.personaInfo;

            personaInfo.Motto = [motto];
            
            fs.writeFileSync(path.join(findPersona.data.driverDirectory, "GetPersonaInfo.xml"), xmlParser.buildXML({ ProfileData: personaInfo }));

            return functions.createResponse(true, {});
        }

        return functions.createResponse(false, {});
    },
    createPersona: async (personaName, iconIndex) => {
        let checkNameTaken = await self.getPersonaByName(personaName);
        let parsedIconIndex = parseInt(iconIndex);

        if ((!checkNameTaken.success) && ((typeof personaName) == "string") && (personaName.length >= 3) && (personaName.length <= 14) && (!isNaN(parsedIconIndex))) {
            let newPersonaId;
            let driverFolderName;

            let configDirectory = paths.driverTemplatePath;
            let driverDirectory = paths.driversPath;

            let folderNameList = ["driver1", "driver2", "driver3"];
            let driverDirectoryFiles = fs.readdirSync(driverDirectory);

            for (let folderName of folderNameList) {
                if (!driverDirectoryFiles.includes(folderName)) {
                    driverFolderName = folderName;
                    break;
                }
            }
            
            let driverPath = path.join(driverDirectory, driverFolderName);

            let personaIdList = ["100", "200", "300"];
            let takenPersonaIds = await self.getPersonas(personaIdList);

            for (let personaId of personaIdList) {
                if (!takenPersonaIds.some(persona => persona.personaId == personaId)) {
                    newPersonaId = personaId;
                    break;
                }
            }
            
            if (((typeof driverFolderName) == "string") && ((typeof newPersonaId) == "string")) {
                fs.mkdirSync(driverPath);

                let carslots = fs.readFileSync(path.join(configDirectory, "carslots.xml")).toString();
                let GetPersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(configDirectory, "GetPersonaInfo.xml")).toString());
                let gettreasurehunteventsession = fs.readFileSync(path.join(configDirectory, "gettreasurehunteventsession.xml")).toString();
                let loadall = await xmlParser.parseXML(fs.readFileSync(path.join(configDirectory, "loadall.xml")).toString());
                let objects = fs.readFileSync(path.join(configDirectory, "objects.xml")).toString();
                
                GetPersonaInfo.ProfileData.IconIndex = [`${parsedIconIndex}`];
                GetPersonaInfo.ProfileData.Name = [personaName];
                GetPersonaInfo.ProfileData.PersonaId = [newPersonaId];
                loadall.AchievementsPacket.PersonaId = [newPersonaId];
                
                fs.writeFileSync(path.join(driverPath, "carslots.xml"), carslots);
                fs.writeFileSync(path.join(driverPath, "GetPersonaInfo.xml"), xmlParser.buildXML(GetPersonaInfo));
                fs.writeFileSync(path.join(driverPath, "gettreasurehunteventsession.xml"), gettreasurehunteventsession);
                fs.writeFileSync(path.join(driverPath, "loadall.xml"), xmlParser.buildXML(loadall));
                fs.writeFileSync(path.join(driverPath, "objects.xml"), objects);
                
                return functions.createResponse(true, GetPersonaInfo);
            }
        }

        return functions.createResponse(false, {});
    },
    deletePersona: async (personaId) => {
        let findPersona = await self.getPersonaById(personaId);
        if (!findPersona.success) return functions.createResponse(false, {});
        
        (fs.rmSync ? fs.rmSync : fs.rmdirSync)(findPersona.data.driverDirectory, { recursive: true });
        fs.writeFileSync(path.join(paths.driversPath, "DefaultPersonaIdx.xml"), "<UserInfo><defaultPersonaIdx>0</defaultPersonaIdx></UserInfo>");

        return functions.createResponse(true, {});
    }
}