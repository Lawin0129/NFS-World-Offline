let SuppressLogs = false;

module.exports = {
    setSuppressLogs: (bool) => {
        SuppressLogs = bool;
    },
    backend: (...msgArgs) => {
        if (!SuppressLogs) console.log(`[\x1b[32mBACKEND\x1b[0m] ${msgArgs.join(" ")}`);
    },
    xmpp: (...msgArgs) => {
        if (!SuppressLogs) console.log(`[\x1b[34mXMPP\x1b[0m] ${msgArgs.join(" ")}`);
    },
    game: (...msgArgs) => {
        if (!SuppressLogs) console.log(`[\x1b[33mGAME\x1b[0m] ${msgArgs.join(" ")}`);
    },
    freeroam: (...msgArgs) => {
        if (!SuppressLogs) console.log(`[\x1b[35mFREEROAM\x1b[0m] ${msgArgs.join(" ")}`);
    },
    error: (type, ...msgArgs) => {
        if (!SuppressLogs) console.log(`[\x1b[31m${type.toUpperCase()} ERROR\x1b[0m] ${msgArgs.join(" ")}`);
    }
}