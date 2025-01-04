async function sleep(ms) {
    await new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    })
}

function between(min, max) {  
    return Math.floor(Math.random() * (max - min + 1) + min);
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
    between,
    MakeID,
    createResponse
}