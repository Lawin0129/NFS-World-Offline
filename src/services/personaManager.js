const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const xmlParser = require("../utils/xmlParser");
const response = require("../utils/response");
const error = require("../utils/error");
const xmppManager = require("../services/xmppManager");

let personaFiles = [
    "GetPersonaInfo.xml",
    "carslots.xml",
    "gettreasurehunteventsession.xml",
    "loadall.xml",
    "objects.xml"
];

let activePersona = { driverDirectory: "", driver: "", personaId: "" };

let self = module.exports = {
    getPersonas: async (personaIds) => {
        let driversDir = paths.driversPath;
        let driverIdx = 0;
        let drivers = [];
        
        for (let file of fs.readdirSync(driversDir)) {
            if (driverIdx >= 3) break;

            let driverDirectory = path.join(driversDir, file);
            
            if (file.startsWith("driver") && Number.isInteger(parseInt(file.replace("driver", ""))) && fs.statSync(driverDirectory).isDirectory()) {
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
        if (findPersona.length == 0) return error.personaNotFound();
        
        return response.createSuccess(findPersona[0]);
    },
    getPersonaByName: async (personaName) => {
        let driversDir = paths.driversPath;
        let driverIdx = 0;
        
        for (let file of fs.readdirSync(driversDir)) {
            if (driverIdx >= 3) break;

            let driverDirectory = path.join(driversDir, file);
            
            if (file.startsWith("driver") && Number.isInteger(parseInt(file.replace("driver", ""))) && fs.statSync(driverDirectory).isDirectory()) {
                let filesInDriver = fs.readdirSync(driverDirectory);
                if (!personaFiles.every(fileName => filesInDriver.includes(fileName))) continue;
                
                let PersonaInfo = await xmlParser.parseXML(fs.readFileSync(path.join(driverDirectory, "GetPersonaInfo.xml")).toString());
                
                if (personaName == PersonaInfo.ProfileData.Name[0]) {
                    return response.createSuccess({
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
        
        return error.personaNotFound();
    },
    getDefaultPersonaIdx: async () => {
        const parsedDefaultIdx = await xmlParser.parseXML(fs.readFileSync(path.join(paths.driversPath, "DefaultPersonaIdx.xml")).toString());

        return response.createSuccess(parsedDefaultIdx?.UserInfo?.defaultPersonaIdx?.[0]);
    },
    setDefaultPersonaIdx: (personaIdx) => {
        let parsedPersonaIdx = parseInt(personaIdx);
        if (!Number.isInteger(parsedPersonaIdx)) return error.invalidParameters();

        fs.writeFileSync(path.join(paths.driversPath, "DefaultPersonaIdx.xml"), `<UserInfo><defaultPersonaIdx>${parsedPersonaIdx}</defaultPersonaIdx></UserInfo>`);

        return response.createSuccess();
    },
    getActivePersona: () => {
        if (activePersona.driver.length == 0) return error.noActivePersona();
        
        return response.createSuccess(activePersona);
    },
    removeActivePersona: () => {
        activePersona = { driverDirectory: "", driver: "", personaId: "" };
        xmppManager.removeActiveXmppClientData(true);

        return response.createSuccess();
    },
    setActivePersona: async (personaId) => {
        self.removeActivePersona();
        
        const findPersona = await self.getPersonaById(personaId);
        if (!findPersona.success) return error.personaNotFound();
        
        activePersona = {
            driverDirectory: findPersona.data.driverDirectory,
            driver: path.basename(findPersona.data.driverDirectory),
            personaId: findPersona.data.personaId
        };
        
        self.setDefaultPersonaIdx(findPersona.data.driverIdx);
        
        return response.createSuccess();
    },
    setMotto: async (personaId, motto) => {
        if ((typeof motto) != "string") return error.invalidParameters();
        if (motto.length > 60) return error.personaMottoTooLong();

        const findPersona = await self.getPersonaById(personaId);
        if (!findPersona.success) return error.personaNotFound();
        
        let personaInfo = findPersona.data.personaInfo;
        
        personaInfo.Motto = [motto];
        
        fs.writeFileSync(path.join(findPersona.data.driverDirectory, "GetPersonaInfo.xml"), xmlParser.buildXML({ ProfileData: personaInfo }));
        
        return response.createSuccess();
    },
    createPersona: async (personaName, iconIndex) => {
        let parsedIconIndex = parseInt(iconIndex);

        if (!Number.isInteger(parsedIconIndex)) return error.invalidParameters();
        if ((typeof personaName) != "string") return error.invalidParameters();
        if (personaName.length < 3) return error.personaNameTooShort();
        if (personaName.length > 14) return error.personaNameTooLong();

        let checkNameTaken = await self.getPersonaByName(personaName);
        if (checkNameTaken.success) return error.personaNameAlreadyTaken();
        
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

        if (((typeof driverFolderName) != "string") || ((typeof newPersonaId) != "string")) return error.maxPersonasReached();
        
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
        
        return response.createSuccess(GetPersonaInfo);
    },
    deletePersona: async (personaId) => {
        let findPersona = await self.getPersonaById(personaId);
        if (!findPersona.success) return error.personaNotFound();
        
        self.removeActivePersona();
        (fs.rmSync ? fs.rmSync : fs.rmdirSync)(findPersona.data.driverDirectory, { recursive: true });
        self.setDefaultPersonaIdx(0);

        return response.createSuccess();
    }
}