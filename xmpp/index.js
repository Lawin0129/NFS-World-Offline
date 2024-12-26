const net = require("net");
const functions = require("../utils/functions");

const PORT = 5222;

const tcpServer = net.createServer((socket) => {
    console.log("\nA new XMPP client has connected.");

    socket.on("data", (data) => {
        if (Buffer.isBuffer(data)) data = data.toString();

        if (data.trim() == "</stream:stream>") socket.write("</stream:stream>");
    });

    socket.on("close", () => socket.destroy());
    socket.on("end", () => console.log('\nXMPP Client disconnected.'));
    socket.on("error", (err) => { console.log(`\nXMPP Socket Error: ${err.message}`); socket.destroy(); });
});

tcpServer.on("error", async (err) => {
    if (err.code == "EADDRINUSE") {
        console.log(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
        await functions.sleep(3000)
        process.exit(0);
    } else throw err;
});

tcpServer.listen(PORT, () => {
    console.log(`XMPP server now listening on port ${PORT}`);
});