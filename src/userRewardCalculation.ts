const { bnum } = require('./utils');
import { BigNumber } from 'bignumber.js';

interface UserPoolData {
    pool: string;
    feeFactor: string;
    balAndRatioFactor: string;
    wrapFactor: string;
    valueUSD: string;
    factorUSD: string;
}

export function sumUserLiquidity(pools, bal_per_snapshot) {
    let finalBalancerLiquidity = pools.reduce((aggregator, pool) => {
        return aggregator.plus(pool.adjustedPoolLiquidity);
    }, bnum(0));

    // assert that the final liquidity is gives a "boost" of 1 in the stakingBoost function when this val is passed as totalBalancerLiquidityTemp
    // targetFinalBalancerLiquidity == finalLiquidity

    // All the pools the user was involved with in the block
    let userPools: { [userAddress: string]: UserPoolData[] } = {};

    // The total liquidity each user contributed in the block
    let userLiquidity: { [userAddress: string]: BigNumber } = {};

    // Adjust pool liquidity
    for (const pool of pools) {
        const { bptSupply } = pool;
        // if total supply == 0, it's private
        const isPrivatePool = bptSupply.eq(bnum(0));
        if (isPrivatePool) {
            // Private pool
            const privatePool: UserPoolData = {
                pool: pool.poolAddress,
                feeFactor: pool.feeFactor.toString(),
                balAndRatioFactor: pool.balAndRatioFactor.toString(),
                wrapFactor: pool.wrapFactor.toString(),
                valueUSD: pool.liquidity.toString(),
                factorUSD: pool.adjustedPoolLiquidity.toString(),
            };

            const lp = pool.controller;
            if (userPools[lp]) {
                userPools[lp].push(privatePool);
            } else {
                userPools[lp] = [privatePool];
            }

            userLiquidity[lp] = (userLiquidity[lp] || bnum(0)).plus(
                pool.adjustedPoolLiquidity
            );
        } else {
            // Shared pool
            let totalLPBal = pool.lpBalances.reduce(
                (a, b) => a.plus(b),
                bnum(0)
            );
            //console.log(
            //"\nSHARED POOL",
            //bptSupply.toNumber(),
            //pool.lpBalances.map((a) => a.toNumber()),
            //totalLPBal.toNumber(),
            //pool.adjustedPoolLiquidity.toNumber(),
            //"\n"
            //);

            for (const i in pool.liquidityProviders) {
                let lp = pool.liquidityProviders[i];
                let userBalance = pool.lpBalances[i];

                // the value of the user's share of the pool's liquidity
                let lpPoolValue = userBalance
                    .div(bptSupply)
                    .times(pool.liquidity)
                    .dp(18);

                // the value of the user's share of the pool's adjusted liquidity
                let lpPoolValueFactor = userBalance
                    .div(bptSupply)
                    .times(pool.adjustedPoolLiquidity)
                    .dp(18);

                let sharedPool: UserPoolData = {
                    pool: pool.poolAddress,
                    feeFactor: pool.feeFactor.toString(),
                    balAndRatioFactor: pool.balAndRatioFactor.toString(),
                    wrapFactor: pool.wrapFactor.toString(),
                    valueUSD: lpPoolValue.toString(),
                    factorUSD: lpPoolValueFactor.toString(),
                };
                if (userPools[lp]) {
                    userPools[lp].push(sharedPool);
                } else {
                    userPools[lp] = [sharedPool];
                }

                // Add this pool's liquidity to the user's total liquidity
                userLiquidity[lp] = (userLiquidity[lp] || bnum(0)).plus(
                    lpPoolValueFactor
                );
            }
        }
    }

    // Final iteration across all users to calculate their BAL tokens for this block
    let userBalReceived: { [key: string]: BigNumber } = {};
    for (const user in userLiquidity) {
        userBalReceived[user] = userLiquidity[user]
            .div(finalBalancerLiquidity)
            .times(bal_per_snapshot)
            .dp(18);
    }

    let totalUserBal = Object.values(userBalReceived).reduce(
        (a, bal) => a.plus(bal),
        bnum(0)
    );
    if (totalUserBal.minus(bal_per_snapshot).abs().gt(0.1)) {
        console.log(
            'TOTAL USER BAL',
            totalUserBal,
            'BAL PER SNAPSHOT',
            bal_per_snapshot
        );
        throw 'Wrong amount of user Bal has been assigned to users';
    }
    console.log('\nTotal Bal distributed', totalUserBal.toNumber(), '\n');

    return { userPools, userBalReceived };
}
