const fs = require("fs");

module.exports = {
    commandInfo: {
        info: "Outputs a list of commands.",
        helpInfo: "commandName - Provides help information for the specified command.",
        name: "help [commandName]",
    },
    execute: (args) => {
        let msg = "";

        fs.readdirSync("./commands/cmds").forEach(file => {
            const cmd = require(`./${file}`);

            if (!args[0]) {
                if (!msg) msg = '\nFor more information on a specific command, type "help commandName"\n';

                msg += `\n${cmd.commandInfo.name} - ${cmd.commandInfo.info}`;
            } else {
                if (file.toLowerCase() != `${args[0].toLowerCase()}.js`) return;

                msg = `\n${cmd.commandInfo.info}\n\n${cmd.commandInfo.name}\n\n${cmd.commandInfo.helpInfo}`;
            }
        });

        console.log(msg || "\nInvalid command.");
    }
}