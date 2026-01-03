const xml2js = require("xml2js");
const parser = new xml2js.Parser();

const defaultBuilder = new xml2js.Builder({ renderOpts: { pretty: false }, headless: true });
const prettyBuilder = new xml2js.Builder({ renderOpts: { pretty: true }, headless: true });

let self = module.exports = {
    parseXML: async (str) => {
        try {
            return (await parser.parseStringPromise(str));
        } catch {
            return null;
        }
    },
    buildXML: (obj, { pretty = false } = {}) => {
        try {
            return (pretty ? prettyBuilder : defaultBuilder).buildObject(obj);
        } catch {
            return null;
        }
    },
    beautifyXML: async (str) => {
        let parsedXML = await self.parseXML(str);

        return (parsedXML ? self.buildXML(parsedXML, { pretty: true }) : null);
    },
    getRootName: (obj) => {
        return (obj ? Object.keys(obj)[0] : null);
    }
}
