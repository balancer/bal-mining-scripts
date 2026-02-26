const {
    ensureDirectoryExists,
    pricesAvailable,
    readPrices,
    writePrices,
} = require('./lib/fileService');
const cliProgress = require('cli-progress');
const Web3 = require('web3');
const { REP_TOKEN, REP_TOKEN_V2 } = require('./lib/tokens');
const { argv } = require('yargs');

const ENDPOINT = process.env.ENDPOINT_URL;
//const ENDPOINT = "ws://localhost:8546"

const web3 = new Web3(new Web3.providers.WebsocketProvider(ENDPOINT));

if (!argv.startBlock || !argv.endBlock || !argv.week) {
    console.log(
        'Usage: node index.js --week 1 --startBlock 10131642 --endBlock 10156690'
    );
    process.exit();
}

const END_BLOCK = argv.endBlock; // Closest block to reference time at end of week
const START_BLOCK = argv.startBlock; // Closest block to reference time at beginning of week
const WEEK = argv.week; // Week for mining distributions. Ex: 1

(async function () {
    const multibar = new cliProgress.MultiBar(
        {
            clearOnComplete: false,
            format:
                '[{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | {task}',
        },
        cliProgress.Presets.shades_classic
    );

    ensureDirectoryExists(WEEK);

    let startBlockTimestamp = (await web3.eth.getBlock(START_BLOCK)).timestamp;
    let endBlockTimestamp = (await web3.eth.getBlock(END_BLOCK)).timestamp;

    let prices = {};
    console.log(pricesAvailable(WEEK));
    if (pricesAvailable(WEEK)) {
        prices = readPrices(WEEK);
    } else {
        const whitelist = await utils.fetchWhitelist();

        let priceProgress = multibar.create(whitelist.length, 0, {
            task: 'Fetching Prices',
        });

        prices = await utils.fetchTokenPrices(
            whitelist,
            startBlockTimestamp,
            endBlockTimestamp,
            priceProgress
        );

        prices[REP_TOKEN] = prices[REP_TOKEN_V2];

        writePrices(WEEK, prices);
    }
    return;
})();
