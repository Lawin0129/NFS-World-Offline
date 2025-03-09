const https = require("https");
const http = require("http");

module.exports = {
    get: (url, headers = {}) => {
        const requestModule = url.toLowerCase().startsWith("https:") ? https : http;

        return new Promise((resolve, reject) => {
            const attemptReq = requestModule.get(url, { headers }, (res) => {
                let resData = "";

                res.on("data", (chunk) => resData += chunk);
                res.on("end", () => {
                    if (res.statusCode >= 400) reject(new Error("Request failed."));
                    
                    const contentType = res.headers["content-type"] || "";
                    const isJSON = contentType.toLowerCase().includes("application/json");

                    try {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: isJSON ? JSON.parse(resData) : resData
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            });

            attemptReq.on("error", reject);
        });
    }
}