module.exports = (dataStr) => {
    let finalHash = BigInt(0xFFFFFFFF);
    let cFlag = true;

    for (let idx = 0; idx < dataStr.length; idx++) {
        let startHash = finalHash * 33n;
        let upperHash = (startHash >> 32n) & 0xFFFFFFFFn;
        let lowerHash = startHash & 0xFFFFFFFFn;
        let newUpperMultiplier = (upperHash + (cFlag ? 1n : 0n)) & 0xFFFFFFFFn;
        let newLowerMultiplier = (lowerHash + BigInt(dataStr.charCodeAt(idx))) & 0xFFFFFFFFn;

        cFlag = upperHash > newUpperMultiplier;
        finalHash = (newUpperMultiplier << 32n) | newLowerMultiplier;
    }
    
    return `${BigInt.asIntN(64, finalHash)}`;
}