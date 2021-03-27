import { BAL_TOKEN, uncappedTokens, equivalentSets } from './tokens';
import { BigNumber } from 'bignumber.js';
const { bnum } = require('./utils');

const WRAP_FACTOR_HARD = bnum(0.1);
const WRAP_FACTOR_SOFT = bnum(0.2);

export function getFeeFactor(feePercentage) {
    return Math.exp(-Math.pow(feePercentage * 0.25, 2));
}

// higher when greater proportion of BAL
export function getStakingBoostOfPair(
    balMultiplier: BigNumber,
    token1: string,
    weight1: BigNumber,
    token2: string,
    weight2: BigNumber
) {
    if (token1 == BAL_TOKEN && uncappedTokens.includes(token2)) {
        return balMultiplier
            .times(weight1)
            .plus(weight2)
            .div(weight1.plus(weight2));
    } else if (token2 == BAL_TOKEN && uncappedTokens.includes(token1)) {
        return weight1
            .plus(balMultiplier.times(weight2))
            .div(weight1.plus(weight2));
    } else {
        return bnum(1);
    }
}

// brf = stakingBoost*ratioFactor
export function getBalAndRatioFactor(tokens, weights, balMultiplier = bnum(1)) {
    let brfSum = bnum(0);
    let pairWeightSum = bnum(0);
    let n = weights.length;
    for (let j = 0; j < n; j++) {
        if (weights[j].eq(bnum(0))) continue;
        for (let k = j + 1; k < n; k++) {
            let pairWeight = weights[j].times(weights[k]);
            let normalizedWeight1 = weights[j].div(weights[j].plus(weights[k]));
            let normalizedWeight2 = weights[k].div(weights[j].plus(weights[k]));

            let stakingBoostOfPair = getStakingBoostOfPair(
                balMultiplier,
                tokens[j],
                weights[j],
                tokens[k],
                weights[k]
            );

            let ratioFactorOfPair = bnum(4) // stretches factor for equal weighted pairs to 1
                .times(normalizedWeight1)
                .times(normalizedWeight2)
                .times(pairWeight);

            // brfOfPair = stakingBoostOfPair*ratioFactorOfPair
            let brfOfPair = stakingBoostOfPair.times(ratioFactorOfPair);

            // brfSum
            brfSum = brfSum.plus(brfOfPair);
            pairWeightSum = pairWeightSum.plus(pairWeight);
        }
    }

    // brfSum
    return brfSum.div(pairWeightSum);
}

function getWrapFactorOfPair(tokenA, tokenB) {
    let foundTokenA = false;
    let foundTokenB = false;
    for (let set1 in equivalentSets) {
        for (let set2 in equivalentSets[set1]) {
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
    return bnum(1.0);
}

export function getWrapFactor(tokens, weights) {
    let wrapFactorSum = bnum(0);
    let pairWeightSum = bnum(0);
    let n = weights.length;
    for (let x = 0; x < n; x++) {
        if (!weights[x].eq(bnum(0))) {
            for (let y = x + 1; y < n; y++) {
                let pairWeight = weights[x].times(weights[y]);
                let wrapFactorPair: BigNumber = getWrapFactorOfPair(
                    tokens[x],
                    tokens[y]
                );
                wrapFactorSum = wrapFactorSum.plus(
                    wrapFactorPair.times(pairWeight)
                );
                pairWeightSum = pairWeightSum.plus(pairWeight);
            }
        }
    }

    return wrapFactorSum.div(pairWeightSum);
}
