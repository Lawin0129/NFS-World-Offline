const fs = require("fs");
const path = require("path");

let self = module.exports = {
    commandInfo: {
        info: "Outputs a list of commands.",
        helpInfo: "commandName - Provides help information for the specified command.",
        name: "help [commandName]",
    },
    execute: (args) => {
        let msg;
        
        if (!args[0]) {
            msg = 'For more information on a specific command, type "help commandName"\n';

            for (let file of fs.readdirSync(__dirname)) {
                let cmd = require(`./${file}`);
                
                msg += `\n${cmd.commandInfo.name} - ${cmd.commandInfo.info}`;
            }
        } else {
            const commandPath = path.join(__dirname, `${args[0]}.js`);

            if (fs.existsSync(commandPath)) {
                let cmd = require(commandPath);

                msg = `${cmd.commandInfo.info}\n\n${cmd.commandInfo.name}\n\n${cmd.commandInfo.helpInfo}`;
            } else {
                msg = `Invalid command specified.`;
            }
        }

        console.log(`\n${msg}`);
    }
}