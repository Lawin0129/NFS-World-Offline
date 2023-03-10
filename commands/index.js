const fs = require("fs");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("\nFor a list of commands type 'help'");
readline.setPrompt("\n> ");

readline.on('line', (line) => {
    let args = line.trim().split(" ");
    const command = args[0];

    args.splice(0, 1);

    if (fs.existsSync(`./commands/cmds/${command.toLowerCase()}.js`)) require(`./cmds/${command.toLowerCase()}.js`).execute(args);
    else console.log("\nInvalid command.");

    readline.prompt();
});

readline.prompt();