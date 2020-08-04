const Web3 = require('web3');
const BigNumber = require('bignumber.js');
const cliProgress = require('cli-progress');
const fs = require('fs');
const { argv } = require('yargs');

const utils = require('./utils');
const poolAbi = require('./abi/BPool.json');
const tokenAbi = require('./abi/BToken.json');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(`ws://localhost:8546`)
);

BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    DECIMAL_PLACES: 18,
});

const WRAP_FACTOR_HARD = 0.1;
const WRAP_FACTOR_SOFT = 0.7;

function bnum(val) {
    return new BigNumber(val.toString());
}

function getFeeFactor(feePercentage) {
    return Math.exp(-Math.pow(feePercentage * 0.25, 2));
}

function getBalFactor(balMultiplier, token1, weight1, token2, weight2) {
    if (
        token1 == '0xba100000625a3754423978a60c9317c58a424e3D' &&
        uncappedTokens.includes(token2)
    ) {
        return balMultiplier
            .times(weight1)
            .plus(weight2)
            .div(weight1.plus(weight2));
    } else if (
        token2 == '0xba100000625a3754423978a60c9317c58a424e3D' &&
        uncappedTokens.includes(token1)
    ) {
        return weight1
            .plus(balMultiplier.times(weight2))
            .div(weight1.plus(weight2));
    } else {
        return bnum(1);
    }
}

function getRatioFactor(tokens, weights) {
    let ratioFactorSum = bnum(0);
    let pairWeightSum = bnum(0);
    let balMultiplier = bnum(2);
    let n = weights.length;
    for (j = 0; j < n; j++) {
        if (!weights[j].eq(bnum(0))) {
            for (k = j + 1; k < n; k++) {
                let pairWeight = weights[j].times(weights[k]);
                let normalizedWeight1 = weights[j].div(
                    weights[j].plus(weights[k])
                );
                let normalizedWeight2 = weights[k].div(
                    weights[j].plus(weights[k])
                );
                let balFactor = getBalFactor(
                    balMultiplier,
                    tokens[j],
                    weights[j],
                    tokens[k],
                    weights[k]
                );

                ratioFactorSum = ratioFactorSum.plus(
                    balFactor
                        .times(bnum(4))
                        .times(normalizedWeight1)
                        .times(normalizedWeight2)
                        .times(pairWeight)
                );
                pairWeightSum = pairWeightSum.plus(pairWeight);
            }
        }
    }

    ratioFactor = ratioFactorSum.div(pairWeightSum);

    return ratioFactor;
}

const uncappedTokens = [
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
    '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
];

const equivalentSets = [
    [
        [
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
            '0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04', // aETH
            '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5', // cETH
            '0x77f973FCaF871459aa58cd81881Ce453759281bC', // iETH
            '0xf53AD2c6851052A81B42133467480961B2321C09', // PETH
        ],
        [
            '0x5e74C9036fb86BD7eCdcb084a0673EFc32eA31cb', // sETH
        ],
    ],
    [
        [
            '0x6Ee0f7BB50a54AB5253dA0667B0Dc2ee526C30a8', // aBUSD
        ],
        [
            '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
            '0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d', // aDAI
            '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643', // cDAI
            '0x493C57C4763932315A328269E1ADaD09653B9081', // iDAI
            '0x261b45D85cCFeAbb11F022eBa346ee8D1cd488c0', // rDAI
            '0x16de59092dAE5CcF4A1E6439D611fd0653f0Bd01', // yDAI
            '0x06AF07097C9Eeb7fD685c692751D5C66dB49c215', // CHAI
        ],
        [
            '0xe2f2a5C287993345a840Db3B0845fbC70f5935a5', // mUSD
        ],
        [
            '0x81ab848898b5ffD3354dbbEfb333D5D183eEDcB5', // yUSD-SEP20
        ],
        [
            '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8', // yCRV
        ],
        [
            '0x8E870D67F660D95d5be530380D0eC0bd388289E1', // PAX
        ],
        [
            '0x196f4727526eA7FB1e17b2071B3d8eAA38486988', // RSV
        ],
        [
            '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51', // sUSD
            '0x625aE63000f46200499120B906716420bd059240', // aSUSD
            '0x49f4592E641820e928F9919Ef4aBd92a719B4b49', // iSUSD
        ],
        [
            '0x0000000000085d4780B73119b644AE5ecd22b376', // TUSD
            '0x4DA9b813057D04BAef4e5800E36083717b4a0341', // aTUSD
        ],
        [
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
            '0x9bA00D6856a4eDF4665BcA2C2309936572473B7E', // aUSDC
            '0x39AA39c021dfbaE8faC545936693aC917d5E7563', // cUSDC
            '0xF013406A0B1d544238083DF0B93ad0d2cBE0f65f', // iUSDC
            '0xd6aD7a6750A7593E092a9B218d66C0A814a3436e', // yUSDC
        ],
        [
            '0x71fc860F7D3A592A4a98740e39dB31d25db65ae8', // aUSDT
            '0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9', // cUSDT
        ],
        [
            '0x9A48BD0EC040ea4f1D3147C025cd4076A2e71e3e', // USD++
        ],
    ],
    [
        [
            '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
            '0xFC4B8ED459e00e5400be803A9BB3954234FD50e3', // aWBTC
            '0xC11b1268C1A384e55C48c2391d8d480264A3A7F4', // cWBTC
            '0xBA9262578EFef8b3aFf7F60Cd629d6CC8859C8b5', // iWBTC
        ],
        [
            '0x0327112423F3A68efdF1fcF402F6c5CB9f7C33fd', // BTC++
        ],
        [
            '0x3212b29E33587A00FB1C83346f5dBFA69A458923', // imBTC
        ],
        [
            '0x5228a22e72ccC52d415EcFd199F99D0665E7733b', // pBTC
        ],
        [
            '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D', // renBTC
        ],
        [
            '0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6', // sBTC
        ],
    ],
    [
        [
            '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', // BAT
            '0xE1BA0FB44CCb0D11b80F92f4f8Ed94CA3fF51D00', // aBAT
            '0x6C8c6b02E7b2BE14d4fA6022Dfd6d75921D90E4E', // cBAT
        ],
    ],
    [
        [
            '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c', // ENJ
            '0x712DB54daA836B53Ef1EcBb9c6ba3b9Efb073F40', // aENJ
        ],
    ],
    [
        [
            '0xdd974D5C2e2928deA5F71b9825b8b646686BD200', // KNC
            '0x9D91BE44C06d373a8a226E1f3b146956083803eB', // aKNC
            '0x1cC9567EA2eB740824a45F8026cCF8e46973234D', // iKNC
        ],
    ],
    [
        [
            '0x80fB784B7eD66730e8b1DBd9820aFD29931aab03', // LEND
            '0x7D2D3688Df45Ce7C552E19c27e007673da9204B8', // aLEND
        ],
    ],
    [
        [
            '0x514910771AF9Ca656af840dff83E8264EcF986CA', // LINK
            '0xA64BD6C70Cb9051F6A9ba1F163Fdc07E0DfB5F84', // aLINK
            '0x1D496da96caf6b518b133736beca85D5C4F9cBc5', // iLINK
        ],
        [
            '0xbBC455cb4F1B9e4bFC4B73970d360c8f032EfEE6', // sLINK
        ],
    ],
    [
        [
            '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942', // MANA
            '0x6FCE4A401B6B80ACe52baAefE4421Bd188e76F6f', // aMANA
        ],
    ],
    [
        [
            '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', // MKR
            '0x7deB5e830be29F91E298ba5FF1356BB7f8146998', // aMKR
        ],
    ],
    [
        [
            '0x408e41876cCCDC0F92210600ef50372656052a38', // REN
            '0x69948cC03f478B95283F7dbf1CE764d0fc7EC54C', // aREN
        ],
    ],
    [
        [
            '0x1985365e9f78359a9B6AD760e32412f4a445E862', // REP
            '0x71010A9D003445aC60C4e6A7017c1E89A477B438', // aREP
            '0x158079Ee67Fce2f58472A96584A73C7Ab9AC95c1', // cREP
            '0xBd56E9477Fc6997609Cf45F84795eFbDAC642Ff1', // iREP
        ],
    ],
    [
        [
            '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', // SNX
            '0x328C4c80BC7aCa0834Db37e6600A6c49E12Da4DE', // aSNX
        ],
    ],
    [
        [
            '0xE41d2489571d322189246DaFA5ebDe1F4699F498', // ZRX
            '0x6Fb0855c404E09c47C3fBCA25f08d4E41f9F062f', // aZRX
            '0xB3319f5D18Bc0D84dD1b4825Dcde5d5f7266d407', // cZRX
            '0xA7Eb2bc82df18013ecC2A6C533fc29446442EDEe', // iZRX
        ],
    ],
];

function getWrapFactorForPair(tokenA, tokenB) {
    let foundTokenA = false;
    let foundTokenB = false;
    for (set1 in equivalentSets) {
        for (set2 in equivalentSets[set1]) {
            let includesTokenA = equivalentSets[set1][set2].includes(tokenA);
            let includesTokenB = equivalentSets[set1][set2].includes(tokenB);
            if (includesTokenA && includesTokenB) {
                return WRAP_FACTOR_HARD;
            } else if (
                (includesTokenA && foundTokenB) ||
                (includesTokenB && foundTokenA)
            ) {
                return WRAP_FACTOR_SOFT;
            } else if (includesTokenA) {
                foundTokenA = true;
            } else if (includesTokenB) {
                foundTokenB = true;
            }
        }
        if (foundTokenA || foundTokenB) {
            break;
        }
    }
    return 1.0;
}

function getWrapFactor(tokens, weights) {
    let ratioFactorSum = bnum(0);
    let wrapFactorSum = bnum(0);
    let pairWeightSum = bnum(0);
    let n = weights.length;
    for (x = 0; x < n; x++) {
        if (!weights[x].eq(bnum(0))) {
            for (y = x + 1; y < n; y++) {
                let pairWeight = weights[x].times(weights[y]);
                let wrapFactorPair = getWrapFactorForPair(tokens[x], tokens[y]);
                wrapFactorSum = wrapFactorSum.plus(
                    bnum(wrapFactorPair).times(pairWeight)
                );
                pairWeightSum = pairWeightSum.plus(pairWeight);
            }
        }
    }

    wrapFactor = wrapFactorSum.div(pairWeightSum);

    return wrapFactor;
}

if (!argv.startBlock || !argv.endBlock || !argv.week) {
    console.log(
        'Usage: node index.js --week 1 --startBlock 10131642 --endBlock 10156690'
    );
    process.exit();
}

const END_BLOCK = argv.endBlock; // Closest block to reference time at end of week
const START_BLOCK = argv.startBlock; // Closest block to reference time at beginning of week
const WEEK = argv.week; // Week for mining distributions. Ex: 1

const BAL_PER_WEEK = bnum(145000);
const BLOCKS_PER_SNAPSHOT = 256;
const BAL_PER_SNAPSHOT = BAL_PER_WEEK.div(
    bnum(Math.ceil((END_BLOCK - START_BLOCK) / BLOCKS_PER_SNAPSHOT))
); // Ceiling because it includes end block

async function getRewardsAtBlock(i, pools, prices, poolProgress) {
    let totalBalancerLiquidity = bnum(0);

    let block = await web3.eth.getBlock(i);

    let allPoolData = [];
    let userPools = {};
    let userLiquidity = {};
    let tokenTotalMarketCaps = {};

    poolProgress.update(0, { task: `Block ${i} Progress` });

    for (const pool of pools) {
        let poolData = {};
        poolData.poolAddress = pool.id;

        // Check if at least two tokens have a price
        let atLeastTwoTokensHavePrice = false;
        let nTokensHavePrice = 0;

        if (pool.createTime > block.timestamp || !pool.tokensList) {
            continue;
        }

        let bPool = new web3.eth.Contract(poolAbi, poolData.poolAddress);

        let publicSwap = await bPool.methods.isPublicSwap().call(undefined, i);
        if (!publicSwap) {
            continue;
        }

        let currentTokens = await bPool.methods
            .getCurrentTokens()
            .call(undefined, i);

        for (const t of currentTokens) {
            let token = web3.utils.toChecksumAddress(t);
            if (prices[token] !== undefined && prices[token].length > 0) {
                nTokensHavePrice++;
                if (nTokensHavePrice > 1) {
                    atLeastTwoTokensHavePrice = true;
                    break;
                }
            }
        }

        if (!atLeastTwoTokensHavePrice) {
            continue;
        }

        let poolMarketCap = bnum(0);
        let originalPoolMarketCapFactor = bnum(0);
        let eligibleTotalWeight = bnum(0);
        let poolRatios = [];

        for (const t of currentTokens) {
            // Skip token if it doesn't have a price
            let token = web3.utils.toChecksumAddress(t);
            if (prices[token] === undefined || prices[token].length === 0) {
                continue;
            }
            let bToken = new web3.eth.Contract(tokenAbi, token);
            let tokenBalanceWei = await bPool.methods
                .getBalance(token)
                .call(undefined, i);
            let tokenDecimals = await bToken.methods.decimals().call();
            let normWeight = await bPool.methods
                .getNormalizedWeight(token)
                .call(undefined, i);

            eligibleTotalWeight = eligibleTotalWeight.plus(
                utils.scale(normWeight, -18)
            );

            let closestPrice = prices[token].reduce((a, b) => {
                return Math.abs(b[0] - block.timestamp * 1000) <
                    Math.abs(a[0] - block.timestamp * 1000)
                    ? b
                    : a;
            })[1];

            let tokenBalance = utils.scale(tokenBalanceWei, -tokenDecimals);
            let tokenMarketCap = tokenBalance.times(bnum(closestPrice)).dp(18);

            if (poolData.tokens) {
                let obj = {
                    token: t,
                    origMarketCap: tokenMarketCap,
                    normWeight: utils.scale(normWeight, -18),
                };
                poolData.tokens.push(obj);
            } else {
                poolData.tokens = [
                    {
                        token: t,
                        origMarketCap: tokenMarketCap,
                        normWeight: utils.scale(normWeight, -18),
                    },
                ];
            }

            poolRatios.push(utils.scale(normWeight, -18));
            poolMarketCap = poolMarketCap.plus(tokenMarketCap);
        }

        poolData.marketCap = poolMarketCap;
        poolData.eligibleTotalWeight = eligibleTotalWeight;

        let ratioFactor = getRatioFactor(currentTokens, poolRatios);
        let wrapFactor = getWrapFactor(currentTokens, poolRatios);

        let poolFee = await bPool.methods.getSwapFee().call(undefined, i);
        poolFee = utils.scale(poolFee, -16); // -16 = -18 * 100 since it's in percentage terms
        let feeFactor = bnum(getFeeFactor(poolFee));

        originalPoolMarketCapFactor = feeFactor
            .times(ratioFactor)
            .times(wrapFactor)
            .times(poolMarketCap)
            .dp(18);

        poolData.ratioFactor = ratioFactor;
        poolData.wrapFactor = wrapFactor;
        poolData.feeFactor = feeFactor;
        poolData.originalPoolMarketCapFactor = originalPoolMarketCapFactor;

        for (const t in poolData.tokens) {
            let r = poolData.tokens[t];
            let tokenMarketCapWithCap = r.normWeight
                .div(eligibleTotalWeight)
                .times(originalPoolMarketCapFactor);
            if (tokenTotalMarketCaps[r.token]) {
                tokenTotalMarketCaps[r.token] = bnum(
                    tokenTotalMarketCaps[r.token]
                ).plus(tokenMarketCapWithCap);
            } else {
                tokenTotalMarketCaps[r.token] = tokenMarketCapWithCap;
            }
        }

        poolData.shareHolders = pool.shareHolders;
        poolData.controller = pool.controller;
        allPoolData.push(poolData);
    }

    for (const pool of allPoolData) {
        let finalPoolMarketCap = bnum(0);
        let finalPoolMarketCapFactor = bnum(0);

        for (const t of pool.tokens) {
            if (
                !uncappedTokens.includes(t.token) &&
                bnum(tokenTotalMarketCaps[t.token]).isGreaterThan(
                    bnum(10000000)
                )
            ) {
                let tokenMarketCapFactor = bnum(10000000).div(
                    tokenTotalMarketCaps[t.token]
                );
                adjustedTokenMarketCap = t.origMarketCap
                    .times(tokenMarketCapFactor)
                    .dp(18);
            } else {
                adjustedTokenMarketCap = t.origMarketCap;
            }
            finalPoolMarketCap = finalPoolMarketCap.plus(
                adjustedTokenMarketCap
            );
        }

        finalPoolMarketCapFactor = pool.feeFactor
            .times(pool.ratioFactor)
            .times(pool.wrapFactor)
            .times(finalPoolMarketCap)
            .dp(18);

        totalBalancerLiquidity = totalBalancerLiquidity.plus(
            finalPoolMarketCapFactor
        );

        let bPool = new web3.eth.Contract(poolAbi, pool.poolAddress);

        let bptSupplyWei = await bPool.methods.totalSupply().call(undefined, i);
        let bptSupply = utils.scale(bptSupplyWei, -18);

        if (bptSupply.eq(bnum(0))) {
            // Private pool
            if (userPools[pool.controller]) {
                userPools[pool.controller].push({
                    pool: pool.poolAddress,
                    feeFactor: pool.feeFactor.toString(),
                    ratioFactor: pool.ratioFactor.toString(),
                    wrapFactor: pool.wrapFactor.toString(),
                    valueUSD: finalPoolMarketCap.toString(),
                    factorUSD: finalPoolMarketCapFactor.toString(),
                });
            } else {
                userPools[pool.controller] = [
                    {
                        pool: pool.poolAddress,
                        feeFactor: pool.feeFactor.toString(),
                        ratioFactor: pool.ratioFactor.toString(),
                        wrapFactor: pool.wrapFactor.toString(),
                        valueUSD: finalPoolMarketCap.toString(),
                        factorUSD: finalPoolMarketCapFactor.toString(),
                    },
                ];
            }

            // Add this pool liquidity to total user liquidity
            if (userLiquidity[pool.controller]) {
                userLiquidity[pool.controller] = bnum(
                    userLiquidity[pool.controller]
                )
                    .plus(finalPoolMarketCapFactor)
                    .toString();
            } else {
                userLiquidity[
                    pool.controller
                ] = finalPoolMarketCapFactor.toString();
            }
        } else {
            // Shared pool

            for (const holder of pool.shareHolders) {
                let userBalanceWei = await bPool.methods
                    .balanceOf(holder)
                    .call(undefined, i);
                let userBalance = utils.scale(userBalanceWei, -18);
                let userPoolValue = userBalance
                    .div(bptSupply)
                    .times(finalPoolMarketCap)
                    .dp(18);

                let userPoolValueFactor = userBalance
                    .div(bptSupply)
                    .times(finalPoolMarketCapFactor)
                    .dp(18);

                if (userPools[holder]) {
                    userPools[holder].push({
                        pool: pool.poolAddress,
                        feeFactor: pool.feeFactor.toString(),
                        ratioFactor: pool.ratioFactor.toString(),
                        wrapFactor: pool.wrapFactor.toString(),
                        valueUSD: userPoolValue.toString(),
                        factorUSD: userPoolValueFactor.toString(),
                    });
                } else {
                    userPools[holder] = [
                        {
                            pool: pool.poolAddress,
                            feeFactor: pool.feeFactor.toString(),
                            ratioFactor: pool.ratioFactor.toString(),
                            wrapFactor: pool.wrapFactor.toString(),
                            valueUSD: userPoolValue.toString(),
                            factorUSD: userPoolValueFactor.toString(),
                        },
                    ];
                }

                // Add this pool liquidity to total user liquidity
                if (userLiquidity[holder]) {
                    userLiquidity[holder] = bnum(userLiquidity[holder])
                        .plus(userPoolValueFactor)
                        .toString();
                } else {
                    userLiquidity[holder] = userPoolValueFactor.toString();
                }
            }
        }

        poolProgress.increment(1);
    }

    // Final iteration across all users to calculate their BAL tokens for this block
    let userBalReceived = {};
    let balDistributedDoubleCheck = bnum(0);
    for (const user in userLiquidity) {
        userBalReceived[user] = bnum(userLiquidity[user])
            .times(BAL_PER_SNAPSHOT)
            .div(totalBalancerLiquidity);
    }

    return [userPools, userBalReceived, tokenTotalMarketCaps];
}

(async function () {
    const multibar = new cliProgress.MultiBar(
        {
            clearOnComplete: false,
            format:
                '[{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | {task}',
        },
        cliProgress.Presets.shades_classic
    );

    !fs.existsSync(`./reports/${WEEK}/`) && fs.mkdirSync(`./reports/${WEEK}/`);

    let startBlockTimestamp = (await web3.eth.getBlock(START_BLOCK)).timestamp;
    let endBlockTimestamp = (await web3.eth.getBlock(END_BLOCK)).timestamp;

    let pools = await utils.fetchAllPools(END_BLOCK);
    utils.writeData(pools, `/${WEEK}/_pools`);

    let prices = {};

    if (fs.existsSync(`./reports/${WEEK}/_prices.json`)) {
        const jsonString = fs.readFileSync(`./reports/${WEEK}/_prices.json`);
        prices = JSON.parse(jsonString);
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

        // prices['0x1985365e9f78359a9B6AD760e32412f4a445E862'] = prices['0x221657776846890989a759BA2973e427DfF5C9bB']

        let path = `/${WEEK}/_prices`;
        utils.writeData(prices, path);
    }

    const poolProgress = multibar.create(pools.length, 0, {
        task: 'Block Progress',
    });
    const blockProgress = multibar.create(END_BLOCK - START_BLOCK, 0, {
        task: 'Overall Progress',
    });

    for (i = END_BLOCK; i > START_BLOCK; i -= BLOCKS_PER_SNAPSHOT) {
        if (argv.skipBlock && i >= argv.skipBlock) {
            blockProgress.increment(BLOCKS_PER_SNAPSHOT);
            continue;
        }

        let blockRewards = await getRewardsAtBlock(
            i,
            pools,
            prices,
            poolProgress
        );
        let path = `/${WEEK}/${i}`;
        utils.writeData(blockRewards, path);
        blockProgress.increment(BLOCKS_PER_SNAPSHOT);
    }

    blockProgress.stop();
})();
