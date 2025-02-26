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

function getHost(hostHeader) {
    let host = `127.0.0.1:${global.httpPORT}`;

    if (hostHeader) {
        host = (hostHeader.includes(":") ? hostHeader : `${hostHeader}:${global.httpPORT}`);
    }

    return host;
}

function MakeID() {
    return `${between(100000000, 999999999)}`;
}

function createResponse(success, data) {
    return {
        success,
        data
    }
}

module.exports = {
    sleep,
    askQuestion,
    between,
    getHost,
    MakeID,
    createResponse
}