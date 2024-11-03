const fs = require("fs");
const xmlParser = require("../../structs/xmlParser");

module.exports = {
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
        let holidayType = "";

        if (!args[0]) {
            console.log("\nHoliday type not specified, setting holiday type to normal...");
            holidayType = "normal"
        }
        else holidayType = args[0].toLowerCase();

        if (!holidayTypesList[holidayType] && holidayType != "all") return console.log("\nThe holiday type you specified does not exist, please try again with a valid holiday type.");

        let UserSettings = await xmlParser.parseXML(fs.readFileSync("./data/getusersettings.xml").toString());
        let ServerInformation = JSON.parse(fs.readFileSync("./data/GetServerInformation.json").toString());

        let activated = [];
        let disactivated = [];
        let holidayIds = [];

        if (holidayType == "all") {
            for (let holiday in holidayTypesList) {
                if (holiday == "normal") continue;
                activated = activated.concat(holidayTypesList[holiday].activated);
                disactivated = disactivated.concat(holidayTypesList[holiday].disactivated);
                holidayIds = holidayIds.concat(holidayTypesList[holiday].activeHolidayIds);
            }
        } else {
            activated = holidayTypesList[holidayType].activated;
            disactivated = holidayTypesList[holidayType].disactivated;
            holidayIds = holidayTypesList[holidayType].activeHolidayIds;
        }

        UserSettings.User_Settings.activatedHolidaySceneryGroups = [{ string: activated }];
        UserSettings.User_Settings.disactivatedHolidaySceneryGroups = [{ string: disactivated }];
        UserSettings.User_Settings.activeHolidayIds = [{ long: holidayIds }];

        ServerInformation.activatedHolidaySceneryGroups = activated;
        ServerInformation.disactivatedHolidaySceneryGroups = disactivated;

        console.log(`\nSuccessfully set ${holidayType} holiday type. Launch the game and play!`);

        fs.writeFileSync("./data/getusersettings.xml", xmlParser.buildXML(UserSettings));
        fs.writeFileSync("./data/GetServerInformation.json", JSON.stringify(ServerInformation, null, 2));
    }
}