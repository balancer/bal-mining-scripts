const { BAL_TOKEN, uncappedTokens, equivalentSets } = require('./tokens');
const BigNumber = require('bignumber.js');

const CAP_TIERS = [
    0,
    1000000,
    3000000,
    10000000,
    30000000,
    100000000,
];

const WRAP_FACTOR_HARD = 0.1;
const WRAP_FACTOR_SOFT = 0.2;

BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    DECIMAL_PLACES: 18,
});

function bnum(val) {
    return new BigNumber(val.toString());
}

function getCapFactor(token, marketCap, capTier) {
    let cap = CAP_TIERS[capTier];
    if (
        !uncappedTokens.includes(token) &&
        bnum(marketCap).isGreaterThan(bnum(cap))
    ) {
        return bnum(cap).div(marketCap);
    } else {
        return bnum(1);
    }
}

function getFeeFactor(feePercentage) {
    return Math.exp(-Math.pow(feePercentage * 0.25, 2));
}

function getBalFactor(balMultiplier, token1, weight1, token2, weight2) {
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

module.exports = { getCapFactor, getFeeFactor, getBalFactor, getRatioFactor, getWrapFactor };
