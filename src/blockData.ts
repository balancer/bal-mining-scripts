import {
    getPoolInvariantData,
    getPoolVariantData,
    poolLiquidity,
    PoolDataResult,
    PoolData,
    SkipReason,
} from './poolData';
const { scale, bnum } = require('./utils');
const { BLACKLISTED_SHAREHOLDERS } = require('./users');
import { uncappedTokens, tokenCaps, BAL_TOKEN } from './tokens';

const TEMP_BAL_MULTIPLIER = bnum(3);

import { BigNumber } from 'bignumber.js';

interface TokenTotalLiquidities {
    [address: string]: BigNumber;
}

export function getNewBalMultiplier(
    finalLiquidity,
    liquidityPreStaking,
    tempLiquidity,
    tempBalMultiplier = TEMP_BAL_MULTIPLIER
) {
    let desiredLiquidityIncrease = finalLiquidity.minus(liquidityPreStaking);
    let tempLiquidityIncrease = tempLiquidity.minus(liquidityPreStaking);

    // edge case if the liquidity was not increased (no eligible pools)
    if (tempLiquidityIncrease.toNumber() == 0) {
        return tempBalMultiplier;
    }
    return bnum(1.0).plus(
        desiredLiquidityIncrease
            .div(tempLiquidityIncrease)
            .times(tempBalMultiplier.minus(bnum(1.0)))
    );
}

export function sumAdjustedTokenLiquidities(
    pools
): { [address: string]: BigNumber } {
    return pools.reduce((aggregator, poolData) => {
        const { tokens, eligibleTotalWeight, adjustedPoolLiquidity } = poolData;

        for (const r of tokens) {
            // value of token in pool
            let tokenLiquidityWithCap = r.normWeight
                .div(eligibleTotalWeight)
                .times(adjustedPoolLiquidity);

            aggregator[r.token] = (aggregator[r.token] || bnum(0)).plus(
                tokenLiquidityWithCap
            );
        }
        return aggregator;
    }, {});
}

export async function getPoolDataAtBlock(
    web3,
    blockNum,
    pools,
    prices,
    tokenDecimals,
    poolProgress
) {
    let block = await web3.eth.getBlock(blockNum);

    // All the pools that will be included in the calculation
    let allPoolData: PoolData[] = [];
    // multiple derivative pools per real pool that are subdivided by whether
    // they contain BAL held by non-shareholders and shareholders

    // Gather data on all eligible pools
    for (const pool of pools) {
        const result: PoolDataResult | SkipReason = await getPoolInvariantData(
            web3,
            prices,
            tokenDecimals,
            block,
            pool
        );
        // this should return one or two pools (Nonstaking or [Shareholder, Nonshareholder]
        poolProgress.increment(1);
        let skipReason = result as SkipReason;
        if (
            skipReason.privateSwap ||
            skipReason.unpriceable ||
            skipReason.notCreatedByBlock
        ) {
            continue;
        }

        let poolData = result as PoolDataResult;

        allPoolData = allPoolData.concat(poolData.pools);
    }
    return allPoolData;
}

export function processPoolData(poolDatas) {
    //////////////////////////////////////////////////////////////////
    // FIRST PASS - calculate variant data with balMultiplier = 1
    //////////////////////////////////////////////////////////////////
    let firstPassPools = poolDatas.map((p) => {
        const variantFactors = getPoolVariantData(p, bnum(1.0));
        return { ...p, ...variantFactors };
    });

    // Sum the adjusted liquidity of each token from it's presence in each pool
    let adjustedLiquidityPreTokenCap: TokenTotalLiquidities = sumAdjustedTokenLiquidities(
        firstPassPools
    );

    // Calculate token cap factors
    let tokenCapFactors: { [address: string]: BigNumber } = {};
    for (const [tokenAddress, totalLiquidity] of Object.entries(
        adjustedLiquidityPreTokenCap
    )) {
        let uncapped = uncappedTokens.includes(tokenAddress);
        const tokenCap = tokenCaps[tokenAddress];
        if (!uncapped && totalLiquidity.gt(tokenCap)) {
            const tokenCapFactor = tokenCap.div(totalLiquidity);
            tokenCapFactors[tokenAddress] = tokenCapFactor;
        } else {
            tokenCapFactors[tokenAddress] = bnum(1);
        }
    }

    // Capped token liquidities
    let tokenTotalLiquidities: TokenTotalLiquidities = {};
    for (const [tokenAddress, tokenCapFactor] of Object.entries(
        tokenCapFactors
    )) {
        tokenTotalLiquidities[tokenAddress] = tokenCapFactor.times(
            adjustedLiquidityPreTokenCap[tokenAddress]
        );
    }

    //////////////////////////////////////////////////////////////////
    // SECOND PASS
    //////////////////////////////////////////////////////////////////
    let secondPassPools = poolDatas.map((p) => {
        const variantFactors = getPoolVariantData(
            p,
            bnum(1.0),
            tokenCapFactors
        );
        return { ...p, ...variantFactors };
    });

    let secondPassPoolsWithBalMultiplier = poolDatas.map((p) => {
        let balMultiplier = p.canReceiveBoost ? TEMP_BAL_MULTIPLIER : bnum(1.0);
        const variantFactors = getPoolVariantData(
            p,
            balMultiplier,
            tokenCapFactors
        );
        return { ...p, ...variantFactors };
    });

    // Sum the liquidity of each token from it's presence in each pool
    let totalBalancerLiquidity = secondPassPools.reduce((aggregator, pool) => {
        return aggregator.plus(pool.adjustedPoolLiquidity);
    }, bnum(0));

    let totalBalancerLiquidityTemp = secondPassPoolsWithBalMultiplier.reduce(
        (aggregator, pool) => {
            return aggregator.plus(pool.adjustedPoolLiquidity);
        },
        bnum(0)
    );

    let targetFinalLiquidity = totalBalancerLiquidity.div(
        bnum(1).minus(bnum(45000).div(bnum(145000)))
    );

    let newBalMultiplier = getNewBalMultiplier(
        targetFinalLiquidity,
        totalBalancerLiquidity,
        totalBalancerLiquidityTemp,
        TEMP_BAL_MULTIPLIER
    );
    console.log(
        '\nLiquidity Pre Staking:\t',
        totalBalancerLiquidity.toNumber(),
        '\nTarget Adjusted Liquidity:\t',
        targetFinalLiquidity.toNumber(),
        '\nTemp Adjusted Liquidity:\t',
        totalBalancerLiquidityTemp.toNumber(),
        '\nNew Bal Multiplier:\n',
        newBalMultiplier.toNumber(),
        '\n'
    );

    //////////////////////////////////////////////////////////////////
    // FINAL PASS
    //////////////////////////////////////////////////////////////////

    let finalPoolsWithBalMultiplier = poolDatas.map((p) => {
        let balMultiplier = p.canReceiveBoost ? newBalMultiplier : bnum(1.0);
        const variantFactors = getPoolVariantData(
            p,
            balMultiplier,
            tokenCapFactors
        );
        return { ...p, ...variantFactors };
    });

    let finalBalancerLiquidity = finalPoolsWithBalMultiplier.reduce(
        (aggregator, pool) => {
            return aggregator.plus(pool.adjustedPoolLiquidity);
        },
        bnum(0)
    );

    //if (
    //finalBalancerLiquidity.minus(targetFinalLiquidity).abs().gt(bnum(0.01))
    //) {
    //// Note that this can happen if no pools are boostable
    //throw 'Final Balancer Liquidity does not match target';
    //}

    return {
        tokenTotalLiquidities,
        finalPoolsWithBalMultiplier,
        tokenCapFactors,
    };
}
