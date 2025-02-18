const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const functions = require("../utils/functions");
const axios = require("axios");

let self = module.exports = {
    getServerList: async () => {
        let serverList = [];

        try {
            serverList = (await axios.get("https://api.worldunited.gg/serverlist.json")).data;
        } catch {
            return functions.createResponse(false, "Failed to fetch server list, are you connected to the internet?");
        }

        return functions.createResponse(true, serverList);
    },
    getModInfo: async () => {
        let getModInfoPath = path.join(paths.dataPath, "GetModInfo.json");

        if (fs.existsSync(getModInfoPath)) {
            let getModInfoData = JSON.parse(fs.readFileSync(getModInfoPath).toString());
            let serverId = getModInfoData.serverId?.toLowerCase?.();

            if (serverId == "normal") return functions.createResponse(false, {});

            let getServerList = await self.getServerList();
            if (!getServerList.success) return getServerList;

            getServerList = getServerList.data;

            let selectedServer = getServerList.find(server => server.id.toLowerCase() == serverId);
            if (!selectedServer) return functions.createResponse(false, "Invalid server ID.");

            let modInfo;

            try {
                modInfo = (await axios.get(`${selectedServer.ip_address}/Modding/GetModInfo`)).data;
            } catch {
                return functions.createResponse(false, "Failed to fetch mod info, are you connected to the internet?");
            }

            return functions.createResponse(true, modInfo);
        }

        return functions.createResponse(false, {});
    },
    setModInfo: (serverId) => {
        fs.writeFileSync(path.join(paths.dataPath, "GetModInfo.json"), JSON.stringify({ serverId }, null, 2));
        
        return functions.createResponse(true, {});
    }
}