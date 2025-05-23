const response = require("../utils/response");
const error = require("../utils/error");
const xmlParser = require("../utils/xmlParser");
const calculateHashFromData = require("../utils/calculateHashFromData");

let activeXmppClientData = {};

let self = module.exports = {
    getActiveXmppClientData: () => {
        if (!activeXmppClientData.secureSocket) return error.noActiveXmppClient();

        return response.createSuccess(activeXmppClientData);
    },
    removeActiveXmppClientData: (shouldDestroy) => {
        if (shouldDestroy) activeXmppClientData.secureSocket?.destroy?.();
        activeXmppClientData = {};

        return response.createSuccess();
    },
    setActiveXmppClientData: (personaId, secureSocket) => {
        if ((typeof personaId) != "string") return error.invalidParameters();
        if ((typeof secureSocket?.write) != "function") return error.invalidParameters();

        self.removeActiveXmppClientData(true);

        activeXmppClientData.personaId = personaId;
        activeXmppClientData.secureSocket = secureSocket;

        return response.createSuccess();
    },
    sendMessage: (xmppClientData, body) => {
        if ((typeof xmppClientData?.secureSocket?.write) != "function") return error.invalidParameters();
        if ((typeof body) != "string") return error.invalidParameters();
        
        let xmppMessage = {
            message: {
                $: {
                    from: "nfsw.engine.LAWIN@localhost/EA_Chat",
                    id: "LAWIN",
                    to: `nfsw.${xmppClientData.personaId}@localhost`
                },
                body: [body],
                subject: []
            }
        };
        
        xmppMessage.message.subject[0] = calculateHashFromData(xmppMessage.message.$.to + body);
        xmppClientData.secureSocket.write(xmlParser.buildXML(xmppMessage));
        
        return response.createSuccess();
    },
    sendSystemChat: (xmppClientData, msg) => {
        if ((typeof msg) != "string") return error.invalidParameters();

        const attemptSend = self.sendMessage(xmppClientData, xmlParser.buildXML({
            response: {
                $: {
                    status: "1",
                    ticket: "0"
                },
                ChatBroadcast: [{
                    ChatBlob: [{
                        FromName: ["System"],
                        FromPersonaId: ["0"],
                        FromUserId: ["0"],
                        Message: [msg],
                        ToId: ["0"],
                        Type: ["2"]
                    }]
                }]
            }
        }));

        return attemptSend;
    }
}
