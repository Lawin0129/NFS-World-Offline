const config = require("../../config/config.json");
const num = require("./num");

async function sleep(ms) {
    await new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    })
}

function askQuestion(question, ReadLine) {
    let qPromise = new Promise((resolve, reject) => {
        ReadLine.question(question, (ans) => resolve(ans));
    });

    return qPromise;
}

function daysBetween(first, second) {
    const firstDate = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    const secondDate = new Date(second.getFullYear(), second.getMonth(), second.getDate());

    return Math.round((firstDate - secondDate) / 86400000);
}

function diffArrays(a, b) {
    const valueCount = (arr) => {
        let valueMap = new Map();

        for (let value of arr) {
            valueMap.set(value, (valueMap.get(value) || 0) + 1);
        }

        return valueMap;
    }
    
    const A = valueCount(a);
    const B = valueCount(b);
    
    return [ ...new Set([ ...(A.keys()), ...(B.keys()) ]) ]
        .map(x => [x, (B.get(x) || 0) - (A.get(x) || 0)])
        .filter(([key, diff]) => diff != 0);
}

function MakeID() {
    return `${num.between(1, num.constants.INT32.MAX)}`;
}

function getHost(hostHeader) {
    let host = `127.0.0.1:${config.httpPORT}`;

    if (hostHeader) {
        host = (hostHeader.includes(":") ? hostHeader : `${hostHeader}:${config.httpPORT}`);
    }

    return host;
}

module.exports = {
    sleep,
    askQuestion,
    daysBetween,
    diffArrays,
    MakeID,
    getHost
}
