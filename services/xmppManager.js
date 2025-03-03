const response = require("../utils/response");
const error = require("../utils/error");
const xmlParser = require("../utils/xmlParser");
const calculateHashFromData = require("../utils/calculateHashFromData");

module.exports = {
    sendMessage: (xmppClientData, body) => {
        if ((typeof xmppClientData) != "object") return error.invalidParameters();
        if ((typeof body) != "string") return error.invalidParameters();
        
        let xmppMessage = {
            message: {
                $: {
                    from: "nfsw.engine.LAWIN@localhost/EA_Chat",
                    id: "LAWIN",
                    to: `nfsw.${xmppClientData.personaId}@localhost`
                },
                body: [body],
                subject: ["LAWIN"]
            }
        };
        
        xmppMessage.message.subject[0] = calculateHashFromData(xmppMessage.message.$.to + body);
        xmppClientData.secureSocket?.write?.(xmlParser.buildXML(xmppMessage));
        
        return response.createSuccess();
    }
}