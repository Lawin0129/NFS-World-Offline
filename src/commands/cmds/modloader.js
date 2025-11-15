const functions = require("../../utils/functions");
const sbrwManager = require("../../services/sbrwManager");

let self = module.exports = {
    commandInfo: {
        info: "This command is used to set which SBRW server mods load when using Soapbox Launcher.",
        helpInfo: "Upon running this command, a list of SBRW servers will be displayed where you can choose one along with the option to disable mods.",
        extraInfo: "-- ModLoader sets the SBRW server to fetch mod info from. When you launch the game using Soapbox Launcher, it fetches the latest mod information from the SBRW server that was selected using this command. This guarantees the mods are always up-to-date.\n"
                 + "-- By default, no SBRW server is selected and the base game will load upon launch.\n"
                 + "-- This does not create a duplicate of mods which means the mods directory is shared with the selected SBRW server.\n"
                 + "-- If there is no internet connection, the base game will load instead.\n"
                 + "-- NOTE: You need the specific catalog and basket xml files for your selected SBRW server to access the added cars and items in the shop. You can usually get them by asking in the respective SBRW Discord servers. Some servers already have the necessary files dumped and shared for users.",
        name: "modloader",
    },
    execute: async (args, readline) => {
        console.log(`\n${self.commandInfo.info}\n\n${self.commandInfo.extraInfo}`);

        let getServerList = await sbrwManager.getServerList();
        if (!getServerList.success) {
            console.log(`\n${getServerList.error.reason}`);
            return;
        }

        getServerList = getServerList.data;

        const serverOptions = getServerList.map((val, i) => ` [${i}] ${val.name} (${val.category})`).join("\n")
                            + `\n [${getServerList.length}] Normal - No mods, base game.`;

        console.log(`\nSelect a server:\n${serverOptions}`);

        let optionSelect = await functions.askQuestion("\nEnter a number: ", readline);
        
        let serverOptionNum = Number.isInteger(parseInt(optionSelect)) ? parseInt(optionSelect) : -1;
        let serverData = getServerList[serverOptionNum];

        if ((!serverData) && (serverOptionNum != getServerList.length)) {
            console.log("\nThe server option you picked does not exist, please try again with a valid number.");
            return;
        }

        let serverId = serverData?.id ?? "normal";

        sbrwManager.setModInfo(serverId);

        if (serverId != "normal") {
            console.log(`\nSuccessfully set the server target to "${serverData.name}".`
                      + "\nThe server mods will load upon launch using the soapbox launcher."
                      + "\nIf you have played on that server before, the mods should load instantly.");
        } else {
            console.log("\nSuccessfully disabled mods."
                      + "\nThe base game will load upon launch.");
        }
    }
}
