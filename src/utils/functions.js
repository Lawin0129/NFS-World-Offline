const config = require("../../config/config.json");

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

function between(min, max) {  
    return Math.floor(Math.random() * (max - min + 1) + min);
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
    return `${between(100000000, 999999999)}`;
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
    between,
    diffArrays,
    MakeID,
    getHost
}
