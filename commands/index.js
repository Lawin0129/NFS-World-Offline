const fs = require("fs");
const path = require("path");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\nFor a list of commands type 'help'");
readline.setPrompt("\n> ");

readline.on('line', async (line) => {
    let args = line.trim().split(" ");
    let command = args[0];

    args.splice(0, 1);

    if (fs.existsSync(path.join(__dirname, "cmds", `${command.toLowerCase()}.js`))) {
        await require(`./cmds/${command.toLowerCase()}.js`).execute(args);
    } else {
        console.log("\nInvalid command.");
    }

    readline.prompt();
});

readline.prompt();