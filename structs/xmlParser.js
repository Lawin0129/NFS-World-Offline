const xml2js = require("xml2js");
const parser = new xml2js.Parser();
const builder = new xml2js.Builder({ renderOpts: { pretty: true }, headless: true });

module.exports = {
    parseXML: async (str) => {
        return (await parser.parseStringPromise(str));
    },
    buildXML: (obj) => {
        return (builder.buildObject(obj));
    },
    getRootName: (obj) => {
        return (Object.keys((obj || {}))[0]);
    }
}