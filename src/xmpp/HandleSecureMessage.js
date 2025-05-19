const config = require("../../config/config.json");
const xmlParser = require("../utils/xmlParser");
const log = require("../utils/log");
const personaManager = require("../services/personaManager");
const xmppManager = require("../services/xmppManager");

let sentLoginMessage = false;
const loginMessage = "----------------------------------------------------\n" +
                     "Welcome to NFS World Offline by Lawin!\n" +
                     "----------------------------------------------------";

module.exports = async (clientData, msg) => {
    if (clientData.disconnected) return;
    
    msg = msg.toString().trim().replace(/'>$/, "'/>");
    if (!msg) return;

    if (config.LogRequests) log.xmpp(`Received data from secure XMPP client: ${msg}`);

    if (msg == "</stream:stream>") {
        clientData.disconnected = true;
        xmppManager.removeActiveXmppClientData(false);
        clientData.secureSocket.write("</stream:stream>");
        return;
    }
    
    const parsedMsg = await xmlParser.parseXML(msg);
    const stanza = xmlParser.getRootName(parsedMsg);
    if (!stanza) return;

    switch (stanza) {
        case "stream:stream": {
            clientData.secureSocket.write("<stream:stream xmlns='jabber:client' xml:lang='en' xmlns:stream='http://etherx.jabber.org/streams' from='localhost' id='LAWIN' version='1.0'><stream:features/>");
            break;
        }

        case "iq": {
            const iqType = parsedMsg.iq.$?.type;
            const iqId = parsedMsg.iq.$?.id;
            if ((typeof iqType) != "string") break;
            if ((typeof iqId) != "string") break;

            let username = parsedMsg.iq.query?.[0]?.username?.[0];
            if ((typeof username) != "string") break;

            username = username.split(".")[1];
            if (!username) break;
            
            const findPersona = personaManager.getActivePersona();
            if (!findPersona.success) break;

            username = findPersona.data.personaId;

            switch (iqType) {
                case "get": {
                    clientData.secureSocket.write(`<iq id='${iqId}' type='result' xml:lang='en'><query xmlns='jabber:iq:auth'><username>nfsw.${username}</username><password/><digest/><resource/><clientlock xmlns='http://www.jabber.com/schemas/clientlocking.xsd'/></query></iq>`);
                    break;
                }

                case "set": {
                    clientData.secureSocket.write(`<iq id='${iqId}' type='result' xml:lang='en'/>`);
                    
                    clientData.personaId = username;
                    xmppManager.setActiveXmppClientData(username, clientData.secureSocket);

                    if (!sentLoginMessage) {
                        xmppManager.sendSystemChat(clientData, loginMessage);
                        sentLoginMessage = true;
                    }
                    break;
                }
            }

            break;
        }

        case "presence": {
            if (!clientData.personaId) break;

            let to = parsedMsg.presence.$?.to;

            if ((typeof to) == "string") {
                clientData.secureSocket.write(`<presence from='channel.en__1@conference.localhost' to='nfsw.${clientData.personaId}@localhost/EA-Chat' type='error'><error code='401' type='auth'><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></error><x xmlns='http://jabber.org/protocol/muc'/></presence>`);
            }
        }
    }
}
