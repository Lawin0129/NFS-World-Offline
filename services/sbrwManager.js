const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const response = require("../utils/response");
const error = require("../utils/error");
const axios = require("axios");

let requestHeaders = {
    "Cache-Control": "no-store,no-cache",
    "Pragma": "no-cache",
    "User-Agent": "SBRW Launcher 2.2.2 (+https://github.com/SoapBoxRaceWorld/GameLauncher_NFSW)",
    "Connection": "Close",
    "Accept": null,
    "Accept-Encoding": null
};

let self = module.exports = {
    getServerList: async () => {
        let serverList = [];

        try {
            serverList = (await axios.get("https://api.worldunited.gg/serverlist.json", { headers: requestHeaders })).data;
        } catch {
            return response.createError(500, "Failed to fetch server list, are you connected to the internet?");
        }

        return response.createSuccess(serverList);
    },
    getModInfo: async () => {
        let getModInfoPath = path.join(paths.dataPath, "GetModInfo.json");
        if (!fs.existsSync(getModInfoPath)) return response.createError(404);
        
        let getModInfoData = JSON.parse(fs.readFileSync(getModInfoPath).toString());
        let serverId = getModInfoData.serverId?.toLowerCase?.();
        
        if (serverId == "normal") return response.createError(404);
        
        let getServerList = await self.getServerList();
        if (!getServerList.success) return getServerList;
        
        getServerList = getServerList.data;
        
        let selectedServer = getServerList.find(server => server.id.toLowerCase() == serverId);
        if (!selectedServer) return response.createError(404, "Invalid server ID.");
        
        let modInfo;
        
        try {
            modInfo = (await axios.get(`${selectedServer.ip_address}/Modding/GetModInfo`, { headers: requestHeaders })).data;
        } catch {
            return response.createError(500, "Failed to fetch mod info, are you connected to the internet?");
        }
        
        return response.createSuccess(modInfo);
    },
    setModInfo: (serverId) => {
        if ((typeof serverId) != "string") return error.invalidParameters();
        
        fs.writeFileSync(path.join(paths.dataPath, "GetModInfo.json"), JSON.stringify({ serverId }, null, 2));
        
        return response.createSuccess();
    }
}