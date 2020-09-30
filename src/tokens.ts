interface CapTiers {
    [address: string]: string;
}

const capTiers: CapTiers = require('../lib/whitelist');
import { BigNumber } from 'bignumber.js';
const { bnum } = require('./utils');
export const BAL_TOKEN = '0xba100000625a3754423978a60c9317c58a424e3D';

export const uncappedTokens = Object.entries(capTiers)
    .filter(([address, capString]) => capString == 'uncapped')
    .map(([a, c]) => a);

const CAP_TIERS = {
    cap1: bnum(1000000),
    cap2: bnum(3000000),
    cap3: bnum(10000000),
    cap4: bnum(30000000),
    cap5: bnum(100000000),
};

interface TokenCaps {
    [address: string]: BigNumber;
}

export const tokenCaps: TokenCaps = Object.entries(capTiers).reduce(
    (aggregator, capTuple) => {
        const address = capTuple[0];
        const capString = capTuple[1];
        if (capString !== 'uncapped') {
            aggregator[address] = CAP_TIERS[capString];
        }
        return aggregator;
    },
    {}
);

export const equivalentSets = [
    [
        [
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
            '0x3a3A65aAb0dd2A17E3F1947bA16138cd37d08c04', // aETH
            '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5', // cETH
            '0x77f973FCaF871459aa58cd81881Ce453759281bC', // iETH
            '0xf53AD2c6851052A81B42133467480961B2321C09', // PETH
            '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359', // SAI
        ],
        [
            '0x5e74C9036fb86BD7eCdcb084a0673EFc32eA31cb', // sETH
        ],
    ],
    [
        [
            '0x4Fabb145d64652a948d72533023f6E7A623C7C53', // BUSD
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
            '0x5BC25f649fc4e26069dDF4cF4010F9f706c23831', // DUSD
        ],
        [
            '0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd', // GUSD
        ],
        [
            '0xe2f2a5C287993345a840Db3B0845fbC70f5935a5', // mUSD
        ],
        [
            '0xDaFF85B6f5787b2d9eE11CCDf5e852816063326A', // pxUSD-OCT2020
        ],
        [
            '0xF06DdacF71e2992E2122A1a0168C6967aFdf63ce', // uUSDrBTC-DEC
        ],
        [
            '0xD16c79c8A39D44B2F3eB45D2019cd6A42B03E2A9', // uUSDwETH-DEC
        ],
        [
            '0x81ab848898b5ffD3354dbbEfb333D5D183eEDcB5', // yUSD-SEP20
        ],
        [
            '0xB2FdD60AD80ca7bA89B9BAb3b5336c2601C020b4', // yUSD-OCT20
        ],
        [
            '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8', // yCRV
            '0x5dbcF33D8c2E976c6b560249878e6F1491Bca25c', // yyCRV
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
        [
            '0x4954Db6391F4feB5468b6B943D4935353596aEC9', // USDQ
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
        [
            '0x8dAEBADE922dF735c38C80C7eBD708Af50815fAa', // TBTC
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
            '0x221657776846890989a759ba2973e427dff5c9bb', // REPv2
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

export const REP_TOKEN = '0x1985365e9f78359a9B6AD760e32412f4a445E862';
export const REP_TOKEN_V2 = '0x221657776846890989a759BA2973e427DfF5C9bB';
