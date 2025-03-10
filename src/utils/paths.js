const path = require("path");
const rootDir = path.join(__dirname, "..", "..");

module.exports = {
    commandsPath: path.join(rootDir, "src", "commands", "cmds"),
    configPath: path.join(rootDir, "config"),
    driverTemplatePath: path.join(rootDir, "config", "DriverTemplate"),
    dataPath: path.join(rootDir, "data"),
    driversPath: path.join(rootDir, "drivers")
}