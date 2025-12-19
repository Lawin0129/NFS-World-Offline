const https = require("https");
const http = require("http");
const zlib = require("zlib");

const removeContentHeaders = (resHeaders) => {
    delete resHeaders["content-encoding"];
    delete resHeaders["content-length"];
};

function decompressBody(buffer, resHeaders, noDecompress) {
    if (noDecompress) return Promise.resolve(buffer);
    
    const encoding = (resHeaders["content-encoding"] || "").toLowerCase();
    
    if (!buffer || (buffer.length == 0)) {
        return Promise.resolve(buffer);
    }

    return new Promise((resolve, reject) => {
        switch (encoding) {
            case "x-gzip":
            case "gzip": {
                removeContentHeaders(resHeaders);
                zlib.gunzip(buffer, (err, decoded) => err ? reject(err) : resolve(decoded));
                break;
            }

            case "deflate": {
                removeContentHeaders(resHeaders);
                zlib.inflate(buffer, (err, decoded) => {
                    if (!err) return resolve(decoded);
                    
                    // fallback for some servers that send raw deflate
                    zlib.inflateRaw(buffer, (err2, decoded2) => {
                        if (err2) return reject(err); // reject with original inflate error
                        resolve(decoded2);
                    });
                });
                break;
            }

            case "br": {
                removeContentHeaders(resHeaders);
                zlib.brotliDecompress(buffer, (err, decoded) => err ? reject(err) : resolve(decoded));
                break;
            }
            
            case "zstd": {
                if ((typeof zlib.zstdDecompress) == "function") {
                    removeContentHeaders(resHeaders);
                    zlib.zstdDecompress(buffer, (err, decoded) => err ? reject(err) : resolve(decoded));
                } else {
                    resolve(buffer);
                }
                break;
            }
            
            default: {
                resolve(buffer);
                break;
            }
        }
    });
}

function makeRequest(method, url, { headers = {}, body, noDecompress = false, timeoutMS = 60000, MAX_REDIRECTS = 50, redirectCount = 0 } = {}) {
    const requestModule = url.toString().toLowerCase().startsWith("https:") ? https : http;
    let isDone = false;
    
    return new Promise((resolve, reject) => {
        const req = requestModule.request(url, { method, headers }, (res) => {
            let resData = [];
            
            res.on("error", reject);

            // handle redirection
            if ((res.statusCode >= 300) && (res.statusCode < 400) && res.headers.location) {
                // consume the response data to free it from memory
                res.resume();

                if (redirectCount >= MAX_REDIRECTS) {
                    reject(new Error(`Too many redirects (>${MAX_REDIRECTS})`));
                    return;
                }
                
                const redirectURL = new URL(res.headers.location, url);
                
                let newMethod = method;
                let newBody = body;
                let newHeaders = { ...headers };
                if (res.statusCode == 303) {
                    newMethod = "GET";
                    newBody = undefined;
                    
                    for (const headerName of Object.keys(newHeaders)) {
                        if ((headerName.toLowerCase() == "content-length") || (headerName.toLowerCase() == "content-type")) {
                            delete newHeaders[headerName];
                        }
                    }
                }
                
                makeRequest(newMethod, redirectURL, {
                    headers: newHeaders,
                    body: newBody,
                    noDecompress,
                    timeoutMS,
                    MAX_REDIRECTS,
                    redirectCount: (redirectCount + 1)
                }).then(resolve).catch(reject);
                
                return;
            }

            res.on("data", (chunk) => resData.push(chunk));
            res.on("end", () => {
                if (isDone) return;
                isDone = true;

                const buffer = Buffer.concat(resData);

                decompressBody(buffer, res.headers, noDecompress).then(decodedBuffer => {
                    const contentType = (res.headers["content-type"] ?? "").toLowerCase();

                    const isJSON = contentType.includes("json");
                    const isTextLike = /^text\//.test(contentType) || isJSON || contentType.includes("xml");
                    const encoding = res.headers["content-encoding"];

                    let data = decodedBuffer;

                    if (isTextLike && !encoding) {
                        let text = decodedBuffer.toString("utf8");
                        
                        if (isJSON) {
                            try {
                                data = JSON.parse(text);
                            } catch {
                                data = text;
                            }
                        } else {
                            data = text;
                        }
                    }
                    
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }).catch(err => reject(err));
            });
        });

        req.on("error", reject);
        
        if (timeoutMS && (timeoutMS > 0)) {
            req.setTimeout(timeoutMS, () => {
                if (isDone) return;
                req.destroy(new Error(`Request timed out after ${timeoutMS}ms`));
                isDone = true;
            });
        }
        
        if (body != undefined) {
            let payload;

            if (Buffer.isBuffer(body)) {
                payload = body;
            } else if ((typeof body) == "object") {
                try {
                    payload = JSON.stringify(body);
                } catch (err) {
                    req.destroy(err);
                    return;
                }
                
                const hasContentType = Object.keys(headers).some(k => k.toLowerCase() == "content-type");
                
                if (!hasContentType) {
                    req.setHeader("Content-Type", "application/json");
                }
            } else {
                payload = `${body}`;
            }

            req.write(payload);
        }

        req.end();
    });
}

module.exports = {
    get: (url, headers = {}) => makeRequest("GET", url, { headers }),
    post: (url, body, headers = {}) => makeRequest("POST", url, { headers, body }),
    put: (url, body, headers = {}) => makeRequest("PUT", url, { headers, body }),
    patch: (url, body, headers = {}) => makeRequest("PATCH", url, { headers, body }),
    delete: (url, headers = {}) => makeRequest("DELETE", url, { headers }),
    head: (url, headers = {}) => makeRequest("HEAD", url, { headers }),
    options: (url, headers = {}) => makeRequest("OPTIONS", url, { headers }),
    request: makeRequest
}
