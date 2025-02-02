const path = require("path");
const rootDir = path.join(__dirname, "..");

module.exports = {
    commandsPath: path.join(rootDir, "commands", "cmds"),
    configPath: path.join(rootDir, "Config"),
    driverTemplatePath: path.join(rootDir, "Config", "DriverTemplate"),
    dataPath: path.join(rootDir, "data"),
    driversPath: path.join(rootDir, "drivers")
}