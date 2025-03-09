const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const log = require("../utils/log");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\nFor a list of commands type 'help'");
readline.setPrompt("> ");

readline.on('line', async (line) => {
    log.setSuppressLogs(true);

    let args = line.trim().split(" ");
    let command = args[0];

    args.splice(0, 1);

    const commandPath = path.join(paths.commandsPath, `${command.toLowerCase()}.js`);

    if (fs.existsSync(commandPath)) {
        await require(commandPath).execute(args, readline);
    } else {
        console.log("\nInvalid command.");
    }

    readlinePrompt();

    log.setSuppressLogs(false);
});

readlinePrompt();

function readlinePrompt() {
    console.log();
    readline.prompt();
}