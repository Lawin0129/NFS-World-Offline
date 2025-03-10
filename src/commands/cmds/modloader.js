const functions = require("../../utils/functions");
const sbrwManager = require("../../services/sbrwManager");

let self = module.exports = {
    commandInfo: {
        info: "This command is used to set which SBRW server mods load when you launch the game using the soapbox launcher.",
        helpInfo: "Upon running this command, a list of SBRW servers will be outputted where you can choose one.",
        name: "modloader",
    },
    execute: async (args, readline) => {
        let getServerList = await sbrwManager.getServerList();
        if (!getServerList.success) {
            console.log(`\n${getServerList.error.reason}`);
            return;
        }

        getServerList = getServerList.data;

        const serverOptions = `${getServerList.map((val, i) => ` [${i}] ${val.name} (${val.category})`).join("\n")}\n [${getServerList.length}] Normal - No mods, base game.`;

        console.log(`\n${self.commandInfo.info}\n\nSelect a server:\n${serverOptions}`);

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