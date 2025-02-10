const net = require("net");
const tls = require("tls");
const fs = require("fs");
const path = require("path");
const config = require("../Config/config.json");
const functions = require("../utils/functions");
const xmlParser = require("../utils/xmlParser");
const HandleSecureMessage = require("./HandleSecureMessage");

const KEY = fs.readFileSync(path.join(__dirname, "key.pem"));
const CERT = fs.readFileSync(path.join(__dirname, "cert.pem"));

const PORT = 5222;
const tcpServer = net.createServer((socket) => {
    if (config.LogRequests) console.log("\nXMPP client has connected.");

    let clientData = {};

    socket.on("error", (err) => {
        console.error(`\nXMPP Socket Error: ${err.message}`);
        socket.destroy();
    });
    socket.on("end", () => {
        if (config.LogRequests) console.log('\nXMPP client disconnected.');
    });

    socket.on("data", async (data) => {
        if (clientData.disconnected) return;

        data = data.toString().trim().replace(/'>$/, "'/>");

        if (config.LogRequests) console.log(`Received data from XMPP client: ${data}`);

        if (data == "</stream:stream>") {
            clientData.disconnected = true;
            delete global.xmppClientData;
            socket.write("</stream:stream>");
            return;
        }

        const parsedData = await xmlParser.parseXML(data);
        const stanza = xmlParser.getRootName(parsedData);
        if (!stanza) return;

        switch (stanza) {
            case "stream:stream": {
                socket.write("<stream:stream xmlns='jabber:client' xml:lang='en' xmlns:stream='http://etherx.jabber.org/streams' from='localhost' id='LAWIN' version='1.0'><stream:features><starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls'/></stream:features>");
                break;
            }

            case "starttls": {
                socket.write("<proceed xmlns='urn:ietf:params:xml:ns:xmpp-tls'/>");

                if (config.LogRequests) console.log("Upgrading XMPP connection to TLS...");

                if (!clientData.secureSocket) {
                    clientData.secureSocket = new tls.TLSSocket(socket, {
                        secureContext: tls.createSecureContext({
                            key: KEY,
                            cert: CERT,
                            ciphers: "DEFAULT@SECLEVEL=0",
                            minVersion: "TLSv1"
                        }),
                        rejectUnauthorized: false,
                        requestCert: false,
                        ciphers: "DEFAULT@SECLEVEL=0",
                        minVersion: "TLSv1",
                        isServer: true
                    });
                } else {
                    return;
                }

                clientData.secureSocket.on("error", (err) => {
                    console.error(`\nTLS Socket Error: ${err.message}`);
                    socket.destroy();
                });
                clientData.secureSocket.on("end", () => {
                    if (config.LogRequests) console.log('\nSecure XMPP client disconnected.');
                    delete global.xmppClientData;
                });

                clientData.secureSocket.on("data", (msg) => HandleSecureMessage(clientData, msg));
            }
        }
    });
});

tcpServer.on("error", async (err) => {
    if (err.code == "EADDRINUSE") {
        console.log(`Port ${PORT} is already in use!\nClosing in 3 seconds...`);
        await functions.sleep(3000);
        process.exit(0);
    } else throw err;
});

tcpServer.listen(PORT, () => {
    console.log(`XMPP server now listening on port ${PORT}`);
});