require('regenerator-runtime/runtime');
const Web3 = require('web3');
const cliProgress = require('cli-progress');
const { argv } = require('yargs');

const { fetchAllPools } = require('./lib/subgraph');
const poolAbi = require('./abi/BPool.json');
const tokenAbi = require('./abi/BToken.json');

const { getPoolDataAtBlock, processPoolData } = require('./lib/blockData');
const { sumUserLiquidity } = require('./lib/userRewardCalculation');
const { REP_TOKEN, REP_TOKEN_V2, BAL_TOKEN } = require('./lib/tokens');
const {
    ensureDirectoryExists,
    pricesAvailable,
    readPrices,
    writePrices,
    writePools,
    writeBlockRewards,
} = require('./lib/fileService');
const { bnum, fetchWhitelist, fetchTokenPrices } = require('./lib/utils');

const ENDPOINT = process.env.ENDPOINT_URL;
//const ENDPOINT = "ws://localhost:8546"

const web3 = new Web3(new Web3.providers.WebsocketProvider(ENDPOINT));

if (!argv.startBlock || !argv.endBlock || !argv.week) {
    console.log(
        'Usage: node index.js --week 1 --startBlock 10131642 --endBlock 10156690'
    );
    process.exit();
}

// Parameters for the week's interval
const END_BLOCK = argv.endBlock; // Closest block to reference time at end of week
const START_BLOCK = argv.startBlock; // Closest block to reference time at beginning of week
const WEEK = argv.week; // Week for mining distributions. Ex: 1

// Distribution parameters
const BAL_PER_WEEK = bnum(145000);
const BLOCKS_PER_SNAPSHOT = 256;

const NUM_SNAPSHOTS = Math.ceil(
    (END_BLOCK - START_BLOCK) / BLOCKS_PER_SNAPSHOT
);
const BAL_PER_SNAPSHOT = BAL_PER_WEEK.div(bnum(NUM_SNAPSHOTS)); // Ceiling because it includes end block

(async function () {
    console.log(
        'Computing rewards for week ' +
            WEEK +
            '\n (from block ' +
            START_BLOCK +
            ' to ' +
            END_BLOCK +
            ')'
    );

    const multibar = new cliProgress.MultiBar(
        {
            clearOnComplete: false,
            format:
                '[{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | {task}',
        },
        cliProgress.Presets.shades_classic
    );

    // Setup data directory
    ensureDirectoryExists(WEEK);

    // get start and end time
    let startBlockTimestamp = (await web3.eth.getBlock(START_BLOCK)).timestamp;
    let endBlockTimestamp = (await web3.eth.getBlock(END_BLOCK)).timestamp;
    console.log(
        ' (from timestamp ' +
            startBlockTimestamp +
            ' to ' +
            endBlockTimestamp +
            ')\nBal Per snapshot ' +
            BAL_PER_SNAPSHOT
    );

    // fetch the pools existing at the last block
    let pools = await fetchAllPools(web3.utils, END_BLOCK);
    writePools(WEEK, pools);
    //pools = pools.filter(p =>
    //p.tokensList.includes(BAL_TOKEN) ||
    //p.tokensList.includes('0xba100000625a3754423978a60c9317c58a424e3d')
    //)

    // gather all the decimals of the tokens in the pools
    // assuming these don't change
    let flattenedPoolTokens = pools
        .map((p) => p.tokensList)
        .reduce((flat, xs) => flat.concat(xs), []);
    let allTokensSet = new Set(flattenedPoolTokens);
    let allTokens = [...allTokensSet];
    let tokenDecimals = {};
    allTokens.forEach(async (t) => {
        let bToken = new web3.eth.Contract(tokenAbi, t);
        let decimals = await bToken.methods.decimals().call();
        tokenDecimals[web3.utils.toChecksumAddress(t)] = decimals;
    });

    // fetch the prices or read them from the file
    let prices = {};

    const whitelist = await fetchWhitelist();

    if (pricesAvailable(WEEK)) {
        prices = readPrices(WEEK);
    } else {
        let priceProgress = multibar.create(whitelist.length, 0, {
            task: 'Fetching Prices',
        });

        prices = await fetchTokenPrices(
            whitelist,
            startBlockTimestamp,
            endBlockTimestamp,
            priceProgress
        );

        prices[REP_TOKEN] = prices[REP_TOKEN_V2];

        writePrices(WEEK, prices);
    }
    const blockProgress = multibar.create(NUM_SNAPSHOTS, 0, {
        task: 'Overall Progress',
    });

    // loop backwards through blocks that are spaced by a snapshot window
    // and filter out blocks before argv.skipBlock
    let blockNums = Array.from(
        { length: NUM_SNAPSHOTS },
        (x, i) => END_BLOCK - BLOCKS_PER_SNAPSHOT * i
    ).filter((blockNum) => !(argv.skipBlock && blockNum >= argv.skipBlock));

    const poolProgress = multibar.create(pools.length, 0, {
        task: 'Pool Progress',
    });
    for (let blockNum of blockNums) {
        poolProgress.update(0, { task: `${blockNum} - Pools` });

        const poolData = await getPoolDataAtBlock(
            web3,
            blockNum,
            pools,
            prices,
            tokenDecimals,
            poolProgress
        );

        const {
            tokenTotalLiquidities,
            finalPoolsWithBalMultiplier,
            tokenCapFactors,
        } = processPoolData(poolData);

        const { userPools, userBalReceived } = sumUserLiquidity(
            finalPoolsWithBalMultiplier,
            BAL_PER_SNAPSHOT
        );

        const blockRewards = [
            userPools,
            userBalReceived,
            tokenTotalLiquidities,
        ];

        writeBlockRewards(WEEK, blockNum, blockRewards);
        poolProgress.stop();
        blockProgress.increment(1);
    }

    blockProgress.stop();
    return;
})();
