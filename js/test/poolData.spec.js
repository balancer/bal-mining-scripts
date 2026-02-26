const { expect, assert } = require('chai');
const {
    getPoolInvariantData,
    getPoolVariantData,
    addLiquidities,
    poolLiquidity,
    splitLiquidityProviders,
} = require('../lib/poolData');
const {
    mockWeb3,
    mockPrices,
    mockBlock,
    mockPool,
    mockTokenDecimals,
} = require('./mocks');
const { BAL_TOKEN } = require('../lib/tokens');
const { bnum } = require('../lib/utils');

describe('getPoolInvariantData', () => {
    it('should return a poolData object', async () => {
        let result = await getPoolInvariantData(
            mockWeb3,
            mockPrices,
            mockTokenDecimals,
            mockBlock,
            mockPool
        );
        let firstPool = result.pools[0];
        let expectedFeeFactor = 1;
        assert.deepEqual(
            firstPool.feeFactor.toNumber(),
            expectedFeeFactor,
            'should properly construct pool data'
        );
    });
});

describe('getPoolVariantData', () => {
    let tokens = [
        { token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' },
        { token: '0x1985365e9f78359a9b6ad760e32412f4a445e862' },
    ];
    let poolData = {
        liquidity: bnum(10000),
        feeFactor: bnum(0.9),
        tokens,
        normWeights: [bnum(0.8), bnum(0.2)],
    };
    it('should return a poolData object', () => {
        let result = getPoolVariantData(poolData, bnum('2.0'));
        let balAndRatioFactor = 0.64;
        let adjustedPoolLiquidity = 5760; // 1000*.64 balAndRatioFactor *0.9 feeFactor *0.1 wrapFactor
        let wrapFactor = bnum(1);

        assert.equal(
            result.balAndRatioFactor.toNumber(),
            balAndRatioFactor,
            'should properly calculate bal and ratio factor'
        );
        assert.equal(
            result.adjustedPoolLiquidity.toNumber(),
            adjustedPoolLiquidity,
            'should properly calculate originalPoolLiquidityFactor'
        );
        assert.equal(
            result.wrapFactor.toNumber(),
            wrapFactor,
            'should properly calculate wrapFactor'
        );
    });

    let tUSD = [
        { token: '0x0000000000085d4780B73119b644AE5ecd22b376' }, // TUSD
        { token: '0x4DA9b813057D04BAef4e5800E36083717b4a0341' }, // aTUSD
    ];
    let poolDataTUSD = {
        liquidity: bnum(10000),
        feeFactor: bnum(0.9),
        tokens: tUSD,
        normWeights: [bnum(0.8), bnum(0.2)],
    };

    it('should return a hard wrap factor when tokens are from an equivalent set', () => {
        let result = getPoolVariantData(poolDataTUSD, bnum('2.0'));
        let balAndRatioFactor = 0.64;
        let adjustedPoolLiquidity = 576; // 1000*.64 balAndRatioFactor *0.9 feeFactor *0.1 wrapFactor
        let wrapFactor = 0.1;

        assert.equal(
            result.balAndRatioFactor.toNumber(),
            balAndRatioFactor,
            'should properly calculate bal and ratio factor'
        );
        assert.equal(
            result.adjustedPoolLiquidity.toNumber(),
            adjustedPoolLiquidity,
            'should properly calculate originalPoolLiquidityFactor'
        );
        assert.equal(
            result.wrapFactor.toNumber(),
            wrapFactor,
            'should properly calculate wrapFactor'
        );
    });
});

let tokenCapFactors = {
    '0xB4EFd85c19999D84251304bDA99E90B92300Bd93': bnum(1),
    '0x80fB784B7eD66730e8b1DBd9820aFD29931aab03': bnum(1),
};

let tokens = [
    {
        token: '0xB4EFd85c19999D84251304bDA99E90B92300Bd93',
        origLiquidity: bnum(10),
        normWeight: bnum(10),
    },
    {
        token: '0x80fB784B7eD66730e8b1DBd9820aFD29931aab03',
        origLiquidity: bnum(10),
        normWeight: bnum(10),
    },
];

describe('poolLiquidity', () => {
    it('calculates the pools adjusted token liquidity', () => {
        let result = poolLiquidity(tokenCapFactors, tokens);
        let expectedResult = 20;

        assert.equal(
            result.toNumber(),
            expectedResult,
            'should properly calculate the pools market cap'
        );
    });
});

describe('splitLiquidityProviders', () => {
    it('splits pools correctly', () => {
        let poolTokens = [
            BAL_TOKEN,
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', //: "uncapped",
            '0x9A48BD0EC040ea4f1D3147C025cd4076A2e71e3e', //: "cap3",
        ].map((a) => mockWeb3.utils.toChecksumAddress(a));

        let nonshareholders = [
            '0x12aBaf4CB6e7205187583D5ecC151EDcDdC7c2B3',
            '0x39DaD4D2A03A86dd4fef7fCa582553060B8300f4',
            '0x6622315f62cE542829C55Dc35575Cb62592cf0a7',
        ];

        let shareholders = [
            '0x4281E53938C3B1C1D3e8AFD21c02CE8512CDbc93',
            '0x438fd34EAB0E80814a231a983D8BfAf507ae16D4',
            '0x54c3c925B9d715aF541b77F9817544bDC663345E',
        ];

        let poolLiquidityProviders = nonshareholders.concat(shareholders);

        let result = splitLiquidityProviders(
            poolLiquidityProviders,
            poolTokens
        );

        assert.deepEqual(
            result[0],
            nonshareholders,
            'should properly separate nonshareholders'
        );

        assert.deepEqual(
            result[1],
            shareholders,
            'should properly separate shareholders'
        );
    });
    it('doesnt split pools when no BAL present', () => {
        let poolTokens = [
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', //: "uncapped",
            '0x9A48BD0EC040ea4f1D3147C025cd4076A2e71e3e', //: "cap3",
        ].map((a) => mockWeb3.utils.toChecksumAddress(a));

        let nonshareholders = [
            '0x12aBaf4CB6e7205187583D5ecC151EDcDdC7c2B3',
            '0x39DaD4D2A03A86dd4fef7fCa582553060B8300f4',
            '0x6622315f62cE542829C55Dc35575Cb62592cf0a7',
        ];

        let shareholders = [
            '0x4281E53938C3B1C1D3e8AFD21c02CE8512CDbc93',
            '0x438fd34EAB0E80814a231a983D8BfAf507ae16D4',
            '0x54c3c925B9d715aF541b77F9817544bDC663345E',
        ];

        let poolLiquidityProviders = nonshareholders.concat(shareholders);

        let result = splitLiquidityProviders(
            poolLiquidityProviders,
            poolTokens
        );

        assert.deepEqual(
            result[0],
            nonshareholders.concat(shareholders),
            'should properly separate nonshareholders'
        );
    });
});
