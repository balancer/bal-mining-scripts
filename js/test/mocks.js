const Web3 = require('web3');
const { bnum } = require('../lib/utils');
const realWeb3 = new Web3(
    new Web3.providers.WebsocketProvider(`ws://localhost:8546`)
);

const mockTokens = [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    '0x1985365e9f78359a9b6ad760e32412f4a445e862',
];

const mockPool = {
    controller: '0x59a068cc4540c8b8f8ff808ed37fae06584be019',
    createTime: 1592637294,
    id: '0xfff29c8bce4fbe8702e9fa16e0e6c551f364f420',
    publicSwap: true,
    swapFee: 0.006,
    tokensList: mockTokens,
    totalShares: 0,
    liquidity: bnum(45999), // liquidity in $
    shareHolders: [
        '0x59a068cc4540c8b8f8ff808ed37fae06584be019', // each has 1234 so bpt = 4936
        '0x6595732468a241312bc307f327ba0d64f02b3c20',
        '0x9424b1412450d0f8fc2255faf6046b98213b76bd',
        '0xfff29c8bce4fbe8702e9fa16e0e6c551f364f420',
    ],
};

const mockBlock = {
    timestamp: 1600000000,
    number: 10628811,
};

const mockPoolContract = {
    methods: {
        isPublicSwap: function () {
            return {
                call: () => true,
            };
        },
        getCurrentTokens: function () {
            return {
                call: function (arg1, block) {
                    return mockPool.tokensList;
                },
            };
        },
        getBalance: function (token) {
            return {
                call: function (opts, blockNum) {
                    return realWeb3.utils.toWei('1000');
                },
            };
        },
        balanceOf: function () {
            return {
                call: function (token) {
                    return realWeb3.utils.toWei('1234');
                },
            };
        },
        getNormalizedWeight: function () {
            return {
                call: function (token) {
                    return realWeb3.utils.toWei('0.4');
                },
            };
        },
        getSwapFee: function () {
            return {
                call: function (token) {
                    return mockPool.swapFee;
                },
            };
        },
        totalSupply: function () {
            return {
                call: function (token) {
                    return realWeb3.utils.toWei((1234 * 4).toString());
                },
            };
        },
    },
};

const mockTokenContract = {
    methods: {
        decimals: function () {
            return {
                call: () => 18,
            };
        },
    },
};

const mockWeb3 = {
    eth: {
        Contract: function (abi, address) {
            let abiNames = abi.map((a) => a.name);
            if (abiNames.indexOf('mint') != -1) {
                return mockTokenContract;
            } else {
                return mockPoolContract;
            }
        },
        getBlock: function (blockNum) {
            return mockBlock;
        },
    },
    utils: realWeb3.utils,
};

const mockTokenDecimals = {
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 18,
    //'0x1985365e9f78359a9B6AD760e32412f4a445E862': 18,
    '0x1985365e9f78359a9B6AD760e32412f4a445E862': 18,
};

const mockPrices = {
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': [
        [mockBlock.timestamp, 0.999],
    ],
    '0x1985365e9f78359a9B6AD760e32412f4a445E862': [[mockBlock.timestamp, 45]],
};

module.exports = {
    mockWeb3,
    mockPrices,
    mockBlock,
    mockPool,
    mockTokenDecimals,
};
