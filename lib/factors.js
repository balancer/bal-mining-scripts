const { BAL_TOKEN, equivalentSets } = require('./tokens');
const BigNumber = require('bignumber.js');

BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    DECIMAL_PLACES: 18,
});

function bnum(val) {
    return new BigNumber(val.toString());
}

const CAP_TIERS = {
    'cap1': bnum(1000000),
    'cap2': bnum(3000000),
    'cap3': bnum(10000000),
    'cap4': bnum(30000000),
    'cap5': bnum(100000000),
};

const FEE_FACTOR_K = 0.25;

const WRAP_FACTOR_HARD = bnum(0.1);
const WRAP_FACTOR_SOFT = bnum(0.2);

function getCapFactor(token, marketCap, capTier) {
    if (capTier in CAP_TIERS) {
        let cap = CAP_TIERS[capTier];
        if (bnum(marketCap).isGreaterThan(cap)) {
            return cap.div(marketCap);
        }
    }
    return bnum(1);
}

function getFeeFactor(feePercentage) {
    return bnum(Math.exp(-Math.pow(feePercentage * FEE_FACTOR_K, 2)));
}

function getBalFactor(balMultiplier, token1, weight1, capTier1, token2, weight2, capTier2) {
    if (token1 == BAL_TOKEN && !(capTier2 in CAP_TIERS)) {
        return balMultiplier
            .times(weight1)
            .plus(weight2)
            .div(weight1.plus(weight2));
    } else if (token2 == BAL_TOKEN && !(capTier1 in CAP_TIERS)) {
        return weight1
            .plus(balMultiplier.times(weight2))
            .div(weight1.plus(weight2));
    } else {
        return bnum(1);
    }
}

function getRatioFactor(tokens, weights, capTiers) {
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
                    capTiers[j],
                    tokens[k],
                    weights[k],
                    capTiers[k]
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
    return bnum(1);
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
                    wrapFactorPair.times(pairWeight)
                );
                pairWeightSum = pairWeightSum.plus(pairWeight);
            }
        }
    }

    wrapFactor = wrapFactorSum.div(pairWeightSum);

    return wrapFactor;
}

module.exports = { getCapFactor, getFeeFactor, getBalFactor, getRatioFactor, getWrapFactor };
