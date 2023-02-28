const express = require("express");
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xml2js = require("xml2js");
const parser = new xml2js.Parser();
const builder = new xml2js.Builder({ renderOpts: { pretty: false }, headless: true });
const app = express.Router();
const functions = require("../structs/functions.js");

// Check if name is available
app.post("/DriverPersona/ReserveName", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let i in dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, dirFiles[i])).isDirectory() && dirFiles[i].startsWith("driver") && Number(dirFiles[i].replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, dirFiles[i], "GetPersonaInfo.xml"))) continue;

                let PersonaInfo = fs.readFileSync(path.join(driversDir, dirFiles[i], "GetPersonaInfo.xml")).toString();
                parser.parseString(PersonaInfo, (err, result) => PersonaInfo = result);

                if (PersonaInfo.ProfileData.Name[0].toLowerCase() == req.query.name.toLowerCase()) {
                    return res.send("<ArrayOfString><string>NONE</string></ArrayOfString>");
                }

                drivers += 1;
            }
        }
    }

    res.status(200).send("<ArrayOfString/>");
});

// Create driver (persona)
app.post("/DriverPersona/CreatePersona", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    let driverNameTaken = false;
    let driverFolderName;

    for (let i in dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, dirFiles[i])).isDirectory() && dirFiles[i].startsWith("driver") && Number(dirFiles[i].replace("driver", ""))) {
                let PersonaInfo = fs.readFileSync(path.join(driversDir, dirFiles[i], "GetPersonaInfo.xml")).toString();
                parser.parseString(PersonaInfo, (err, result) => PersonaInfo = result);

                if (PersonaInfo.ProfileData.Name[0].toLowerCase() == req.query.name.toLowerCase()) driverNameTaken = true;

                drivers += 1;
            }
        }
    }

    if (!driverNameTaken && req.query.name.length >= 3) {
        let newPersonaId = functions.MakeCarID();
        let newIconIndex = req.query.iconIndex;
        let newName = req.query.name;
        
        let carslots = fs.readFileSync("./Config/DriverTemplate/carslots.xml").toString();
        let GetPersonaInfo = fs.readFileSync("./Config/DriverTemplate/GetPersonaInfo.xml").toString();
        let gettreasurehunteventsession = fs.readFileSync("./Config/DriverTemplate/gettreasurehunteventsession.xml").toString();
        let loadall = fs.readFileSync("./Config/DriverTemplate/loadall.xml").toString();
        let objects = fs.readFileSync("./Config/DriverTemplate/objects.xml").toString();

        parser.parseString(GetPersonaInfo, (err, result) => GetPersonaInfo = result);
        parser.parseString(loadall, (err, result) => loadall = result);

        if (!fs.existsSync("./drivers/driver1")) driverFolderName = "driver1";
        if (!driverFolderName && !fs.existsSync("./drivers/driver2")) driverFolderName = "driver2";
        if (!driverFolderName && !fs.existsSync("./drivers/driver3")) driverFolderName = "driver3";

        let driverPath = `./drivers/${driverFolderName}`;

        if (!fs.existsSync(driverPath) && driverFolderName) {
            fs.mkdirSync(driverPath);

            GetPersonaInfo.ProfileData.IconIndex = [newIconIndex];
            GetPersonaInfo.ProfileData.Name = [newName];
            GetPersonaInfo.ProfileData.PersonaId = [newPersonaId];
            loadall.AchievementsPacket.PersonaId = [newPersonaId];

            loadall = builder.buildObject(loadall);

            fs.writeFileSync(`${driverPath}/carslots.xml`, carslots);
            fs.writeFileSync(`${driverPath}/GetPersonaInfo.xml`, builder.buildObject(GetPersonaInfo));
            fs.writeFileSync(`${driverPath}/gettreasurehunteventsession.xml`, gettreasurehunteventsession);
            fs.writeFileSync(`${driverPath}/loadall.xml`, loadall);
            fs.writeFileSync(`${driverPath}/objects.xml`, objects);

            // enable tutorial
            GetPersonaInfo.ProfileData.Level = ["1"];
            global.newDriver = { personaId: newPersonaId, numOfReqs: 0 };

            return res.send(builder.buildObject(GetPersonaInfo));
        }
    }

    res.status(403).end();
});

// Delete driver (persona)
app.post("/DriverPersona/DeletePersona", compression({ threshold: 0 }), (req, res) => {
    res.type("application/xml");

    let driversDir = path.join(__dirname, "..", "drivers");
    let drivers = 0;

    let dirFiles = fs.readdirSync(driversDir);

    for (let i in dirFiles) {
        if (drivers < 3) {
            if (fs.statSync(path.join(driversDir, dirFiles[i])).isDirectory() && dirFiles[i].startsWith("driver") && Number(dirFiles[i].replace("driver", ""))) {
                if (!fs.existsSync(path.join(driversDir, dirFiles[i], "GetPersonaInfo.xml"))) continue;

                let PersonaInfo = fs.readFileSync(path.join(driversDir, dirFiles[i], "GetPersonaInfo.xml")).toString();
                parser.parseString(PersonaInfo, (err, result) => PersonaInfo = result);

                if (PersonaInfo.ProfileData.PersonaId[0] == req.query.personaId) {
                    fs.rmSync(path.join(driversDir, dirFiles[i]), { recursive: true });

                    return res.send("<long>0</long>");
                }

                drivers += 1;
            }
        }
    }

    res.status(403).end();
});

module.exports = app;