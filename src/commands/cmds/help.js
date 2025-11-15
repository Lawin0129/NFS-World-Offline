const fs = require("fs");
const path = require("path");
const paths = require("../../utils/paths");

let self = module.exports = {
    commandInfo: {
        info: "Outputs a list of commands.",
        helpInfo: "commandName - Provides help information for the specified command.",
        extraInfo: "None.",
        name: "help [commandName]",
    },
    execute: (args) => {
        let msg;
        
        if (!args[0]) {
            msg = 'For more information on a specific command, type "help commandName".\n';

            for (let file of fs.readdirSync(paths.commandsPath)) {
                let cmd = require(`./${file}`);
                
                msg += `\n${cmd.commandInfo.name} - ${cmd.commandInfo.info}`;
            }
        } else {
            const commandPath = path.join(paths.commandsPath, `${args[0]}.js`);

            if (fs.existsSync(commandPath)) {
                let cmd = require(commandPath);

                msg = `**NAME**\n${cmd.commandInfo.name}\n\n**INFO**\n${cmd.commandInfo.info}\n\n**HELP INFO**\n${cmd.commandInfo.helpInfo}\n\n**EXTRA INFO**\n${cmd.commandInfo.extraInfo}`;
            } else {
                msg = `Invalid command specified.`;
            }
        }

        console.log(`\n${msg}`);
    }
}
