const fs = require("fs");
const path = require("path");
const paths = require("../../utils/paths");
const functions = require("../../utils/functions");
const xmlParser = require("../../utils/xmlParser");

let holidayTypesList = [
    { name: "Normal", activated: ["SCENERY_GROUP_NORMAL"], disactivated: ["SCENERY_GROUP_NORMAL_DISABLE"], activeHolidayIds: ["0"] },
    { name: "Christmas", activated: ["SCENERY_GROUP_CHRISTMAS"], disactivated: ["SCENERY_GROUP_CHRISTMAS_DISABLE"], activeHolidayIds: ["3"] },
    { name: "Halloween", activated: ["SCENERY_GROUP_HALLOWEEN"], disactivated: ["SCENERY_GROUP_HALLOWEEN_DISABLE"], activeHolidayIds: ["2"] },
    { name: "New Years", activated: ["SCENERY_GROUP_NEWYEARS"], disactivated: ["SCENERY_GROUP_NEWYEARS_DISABLE"], activeHolidayIds: ["5"] },
    { name: "Valentines", activated: ["SCENERY_GROUP_VALENTINES"], disactivated: ["SCENERY_GROUP_VALENTINES_DISABLE"], activeHolidayIds: ["4"] },
    { name: "Oktoberfest", activated: ["SCENERY_GROUP_OKTOBERFEST"], disactivated: ["SCENERY_GROUP_OKTOBERFEST_DISABLE"], activeHolidayIds: ["1"] }
];

let holidayOptions = holidayTypesList.map((val, i) => ` [${i}] ${val.name}`).join("\n")
                   + `\n [${holidayTypesList.length}] All (some holiday types conflict with each other in-game)`;

let self = module.exports = {
    commandInfo: {
        info: "This command sets the current Need for Speed World holiday type.",
        helpInfo: "Upon running this command, a list of holidays will be displayed where you can choose one.",
        extraInfo: "None.",
        name: "holiday",
    },
    execute: async (args, readline) => {
        console.log(`\n${self.commandInfo.info}\n${self.commandInfo.helpInfo}`);
        console.log(`\nSelect a holiday:\n${holidayOptions}`);

        let optionSelect = await functions.askQuestion("\nEnter a number: ", readline);
        
        let holidayOptionNum = Number.isInteger(parseInt(optionSelect)) ? parseInt(optionSelect) : -1;
        let holidayData = holidayTypesList[holidayOptionNum];

        if ((!holidayData) && (holidayOptionNum != holidayTypesList.length)) {
            console.log("\nThe holiday option you picked does not exist, please try again with a valid number.");
            return;
        }

        let holidayType = holidayData?.name ?? "All";

        let getusersettingsPath = path.join(paths.dataPath, "getusersettings.xml");
        let GetServerInformationPath = path.join(paths.dataPath, "GetServerInformation.json");

        let UserSettings = await xmlParser.parseXML(fs.readFileSync(getusersettingsPath).toString());
        let ServerInformation = JSON.parse(fs.readFileSync(GetServerInformationPath).toString());

        let activated = [];
        let disactivated = [];
        let holidayIds = [];

        if (holidayType == "All") {
            for (let holidayObject of holidayTypesList) {
                if (holidayObject.name == "Normal") continue;
                
                activated = activated.concat(holidayObject.activated);
                disactivated = disactivated.concat(holidayObject.disactivated);
                holidayIds = holidayIds.concat(holidayObject.activeHolidayIds);
            }
        } else {
            activated = holidayData.activated;
            disactivated = holidayData.disactivated;
            holidayIds = holidayData.activeHolidayIds;
        }

        UserSettings.User_Settings.activatedHolidaySceneryGroups = [{ string: activated }];
        UserSettings.User_Settings.disactivatedHolidaySceneryGroups = [{ string: disactivated }];
        UserSettings.User_Settings.activeHolidayIds = [{ long: holidayIds }];

        ServerInformation.activatedHolidaySceneryGroups = activated;
        ServerInformation.disactivatedHolidaySceneryGroups = disactivated;

        console.log(`\nSuccessfully set to ${holidayType} holiday type. Launch the game and play!`);

        fs.writeFileSync(getusersettingsPath, xmlParser.buildXML(UserSettings));
        fs.writeFileSync(GetServerInformationPath, JSON.stringify(ServerInformation, null, 2));
    }
}
