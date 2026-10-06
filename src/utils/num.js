let self = module.exports = {
    constants: {
        INT32: {
            MIN: -2147483648,
            MAX: 2147483647
        },
        UINT32: {
            MIN: 0,
            MAX: 4294967295
        }
    },
    parseFloatAndTruncate: (value) => {
        return Math.trunc(parseFloat(value));
    },
    parseInt32: (value) => {
        const parsedNum = parseInt(value);
        if (Number.isNaN(parsedNum)) return parsedNum;

        return (parsedNum | 0);
    },
    parseUInt32: (value) => {
        const parsedNum = parseInt(value);
        if (Number.isNaN(parsedNum)) return parsedNum;

        return (parsedNum >>> 0);
    },
    between: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },
    randomInt32: () => {
        return self.between(self.constants.INT32.MIN, self.constants.INT32.MAX);
    },
    randomUInt32: () => {
        return self.between(self.constants.UINT32.MIN, self.constants.UINT32.MAX);
    }
}
