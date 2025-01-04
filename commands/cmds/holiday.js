const fs = require("fs");
const path = require("path");
const xmlParser = require("../../utils/xmlParser");

let self = module.exports = {
    commandInfo: {
        info: "This command sets the current Need for Speed World holiday type.",
        helpInfo: "Valid holiday types:\n- Normal\n- All (some holiday types conflict with each other in-game)\n- Christmas\n- Halloween\n- NewYears\n- Valentines\n- Oktoberfest",
        name: `holiday [type]`,
    },
    execute: async (args) => {
        let holidayTypesList = {
            normal: { activated: ["SCENERY_GROUP_NORMAL"], disactivated: ["SCENERY_GROUP_NORMAL_DISABLE"], activeHolidayIds: ["0"] },
            christmas: { activated: ["SCENERY_GROUP_CHRISTMAS"], disactivated: ["SCENERY_GROUP_CHRISTMAS_DISABLE"], activeHolidayIds: ["3"] },
            halloween: { activated: ["SCENERY_GROUP_HALLOWEEN"], disactivated: ["SCENERY_GROUP_HALLOWEEN_DISABLE"], activeHolidayIds: ["2"] },
            newyears: { activated: ["SCENERY_GROUP_NEWYEARS"], disactivated: ["SCENERY_GROUP_NEWYEARS_DISABLE"], activeHolidayIds: ["5"] },
            valentines: { activated: ["SCENERY_GROUP_VALENTINES"], disactivated: ["SCENERY_GROUP_VALENTINES_DISABLE"], activeHolidayIds: ["4"] },
            oktoberfest: { activated: ["SCENERY_GROUP_OKTOBERFEST"], disactivated: ["SCENERY_GROUP_OKTOBERFEST_DISABLE"], activeHolidayIds: ["1"] }
        };

        if (!args[0]) {
            console.log(`\n${self.commandInfo.info}\n\n${self.commandInfo.name}\n\n${self.commandInfo.helpInfo}`);
            return;
        }
        
        let holidayType = args[0].toLowerCase();
        let holidayData = holidayTypesList[holidayType];

        if ((!holidayData) && (holidayType != "all")) {
            console.log("\nThe holiday type you specified does not exist, please try again with a valid holiday type.");
            return;
        }

        let dataDirectory = path.join(__dirname, "..", "..", "data");
        let getusersettingsPath = path.join(dataDirectory, "getusersettings.xml");
        let GetServerInformationPath = path.join(dataDirectory, "GetServerInformation.json");

        let UserSettings = await xmlParser.parseXML(fs.readFileSync(getusersettingsPath).toString());
        let ServerInformation = JSON.parse(fs.readFileSync(GetServerInformationPath).toString());

        let activated = [];
        let disactivated = [];
        let holidayIds = [];

        if (holidayType == "all") {
            for (let holidayKey of Object.keys(holidayTypesList)) {
                if (holidayKey == "normal") continue;
                
                holidayData = holidayTypesList[holidayKey];
                
                activated = activated.concat(holidayData.activated);
                disactivated = disactivated.concat(holidayData.disactivated);
                holidayIds = holidayIds.concat(holidayData.activeHolidayIds);
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

        console.log(`\nSuccessfully set ${holidayType} holiday type. Launch the game and play!`);

        fs.writeFileSync(getusersettingsPath, xmlParser.buildXML(UserSettings));
        fs.writeFileSync(GetServerInformationPath, JSON.stringify(ServerInformation, null, 2));
    }
}