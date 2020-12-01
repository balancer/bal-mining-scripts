const { expect, assert } = require('chai');
const {
    getFeeFactor,
    getStakingBoostOfPair,
    getBalAndRatioFactor,
    getWrapFactor,
} = require('../lib/factors');
const { BAL_TOKEN } = require('../lib/tokens');
const BigNumber = require('bignumber.js');

const SNX_TOKEN = '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F';
const ASNX_TOKEN = '0x328C4c80BC7aCa0834Db37e6600A6c49E12Da4DE';
const WBTC_TOKEN = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';

function bnum(val) {
    return new BigNumber(val.toString());
}

describe('fee factor', () => {
    // e^(-(fee/4)^2)
    it('should calculate the fee factor', () => {
        const expectedResult = 0.7788007830714049;
        const feePercentage = 2;
        const result = getFeeFactor(feePercentage);

        assert.equal(result, expectedResult, 'Should calculate rate correctly');
    });
});

describe('bal factor', () => {
    let balMultiplier = bnum(2);
    it('should calculate the bal factor when token 1 is BAL and token 2 is capped', () => {
        let token1 = BAL_TOKEN;
        let token2 = SNX_TOKEN;
        let weight1 = 0.75;
        let weight2 = 0.25;
        const expectedResult = 1;
        const result = getStakingBoostOfPair(
            balMultiplier,
            token1,
            weight1,
            token2,
            weight2
        );

        assert.equal(
            result.toNumber(),
            expectedResult,
            'Should calculate bal rate correctly exchanging with BAL'
        );
    });

    it('should calculate the bal factor when token 1 is capped and token 2 is BAL', () => {
        let token1 = SNX_TOKEN;
        let token2 = BAL_TOKEN;
        let weight1 = bnum(0.75);
        let weight2 = bnum(0.25);
        const expectedResult = 1;
        const result = getStakingBoostOfPair(
            balMultiplier,
            token1,
            weight1,
            token2,
            weight2
        );

        assert.equal(
            result.toNumber(),
            expectedResult,
            'Should calculate bal rate correctly exchanging with BAL'
        );
    });

    it('should calculate the bal factor when token 1 is uncapped and token 2 is BAL', () => {
        let token1 = WBTC_TOKEN;
        let token2 = BAL_TOKEN;
        let weight1 = bnum(0.75);
        let weight2 = bnum(0.25);
        const expectedResult = 1.25;
        const result = getStakingBoostOfPair(
            balMultiplier,
            token1,
            weight1,
            token2,
            weight2
        );

        assert.equal(
            result.toNumber(),
            expectedResult,
            'Should calculate bal rate correctly with an uncapped token'
        );
    });
});

describe('ratio factor', () => {
    it('should calculate the ratio factor', () => {
        let tokens = [SNX_TOKEN, BAL_TOKEN];
        let weights = [bnum(0.75), bnum(0.25)];
        const expectedResult = 0.75;
        const result = getBalAndRatioFactor(tokens, weights);

        assert.equal(
            result.toNumber(),
            expectedResult,
            'Should calculate rate correctly'
        );
    });
});

describe('wrap factor', () => {
    it('should calculate the wrap factor', () => {
        let tokens = [SNX_TOKEN, BAL_TOKEN];
        let weights = [bnum(0.75), bnum(0.25)];
        const expectedResult = 1;
        const result = getWrapFactor(tokens, weights);

        assert.equal(
            result.toNumber(),
            expectedResult,
            'Should calculate rate correctly'
        );
    });

    it('should calculate the wrap factor when one token is in an equivalent set', () => {
        let tokens = [SNX_TOKEN, ASNX_TOKEN];
        let weights = [bnum(0.75), bnum(0.25)];
        const expectedResult = 0.1;
        const result = getWrapFactor(tokens, weights);

        assert.equal(
            result.toNumber(),
            expectedResult,
            'Should calculate rate correctly within equivalent sets'
        );
    });
});
