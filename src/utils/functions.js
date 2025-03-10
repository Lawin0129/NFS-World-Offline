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
    MakeID,
    getHost
}