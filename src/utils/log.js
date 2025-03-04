module.exports = {
    backend: (...msgArgs) => {
        if (!global.SuppressLogs) console.log(`[\x1b[32mBACKEND\x1b[0m] ${msgArgs.join(" ")}`);
    },
    xmpp: (...msgArgs) => {
        if (!global.SuppressLogs) console.log(`[\x1b[34mXMPP\x1b[0m] ${msgArgs.join(" ")}`);
    },
    game: (...msgArgs) => {
        if (!global.SuppressLogs) console.log(`[\x1b[33mGAME\x1b[0m] ${msgArgs.join(" ")}`);
    },
    error: (type, ...msgArgs) => {
        if (!global.SuppressLogs) console.log(`[\x1b[31m${type.toUpperCase()} ERROR\x1b[0m] ${msgArgs.join(" ")}`);
    }
}