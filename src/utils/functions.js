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

function getLocalTimeISO() {
    const pad = (n, p = 2) => (`${n}`).padStart(p, "0");

    const newDate = new Date();
    const year = newDate.getFullYear();
    const month = pad(newDate.getMonth() + 1);
    const day = pad(newDate.getDate());
    const hour = pad(newDate.getHours());
    const minute = pad(newDate.getMinutes());
    const second = pad(newDate.getSeconds());
    const millisecond = pad(newDate.getMilliseconds(), 3);
    
    const minsOffset = -(newDate.getTimezoneOffset());
    const sign = minsOffset >= 0 ? "+" : "-";
    const absNum = Math.abs(minsOffset);
    const hourOffset = pad(Math.floor(absNum / 60));
    const minuteOffset = pad(absNum % 60);
    
    const timeZoneOffset = `${sign}${hourOffset}:${minuteOffset}`;
    const isoDate = `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}${timeZoneOffset}`;

    return isoDate;
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
    getLocalTimeISO,
    diffArrays,
    MakeID,
    getHost
}
