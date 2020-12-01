import fs from 'fs';

export const writeData = (data, path) => {
    try {
        fs.writeFileSync(
            `./reports/${path}.json`,
            JSON.stringify(data, null, 4)
        );
    } catch (err) {
        console.error(err);
    }
};

export function ensureDirectoryExists(week) {
    !fs.existsSync(`./reports/${week}/`) && fs.mkdirSync(`./reports/${week}/`);
}

export function pricesAvailable(week) {
    return fs.existsSync(`./reports/${week}/_prices.json`);
}

export function readPrices(week) {
    const jsonString = fs.readFileSync(`./reports/${week}/_prices.json`);
    return JSON.parse(jsonString.toString());
}

export function writePrices(week, prices) {
    let path = `/${week}/_prices`;
    writeData(prices, path);
}

export function writeBlockRewards(week, blockNum, blockRewards) {
    let path = `/${week}/${blockNum}`;
    writeData(blockRewards, path);
}

export function writePools(week, pools) {
    writeData(pools, `/${week}/_pools`);
}
