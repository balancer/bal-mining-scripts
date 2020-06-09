const poolAbi = require('../abi/BPool.json');
const { bnum, scale } = require('./utils');
import { uncappedTokens, BAL_TOKEN } from './tokens';
import { BLACKLISTED_SHAREHOLDERS } from './users';
import BigNumber from 'bignumber.js';

const {
    getFeeFactor,
    getBalFactor,
    getBalAndRatioFactor,
    getWrapFactor,
} = require('./factors');

BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    DECIMAL_PLACES: 18,
});

function atLeastTwoTokensHavePrice(tokens, prices): boolean {
    let nTokensHavePrice = 0;
    for (const token of tokens) {
        if (prices[token] !== undefined && prices[token].length > 0) {
            nTokensHavePrice++;
            if (nTokensHavePrice > 1) {
                return true;
            }
        }
    }
    return false;
}

function poolCreatedByBlock(pool, block): boolean {
    return pool.createTime < block.timestamp && pool.tokensList;
}

function closestPrice(token, timestamp, prices): BigNumber {
    let price = prices[token].reduce((a, b) => {
        return Math.abs(b[0] - timestamp * 1000) <
            Math.abs(a[0] - timestamp * 1000)
            ? b
            : a;
    })[1];
    return bnum(price);
}

interface TokenData {
    token: string;
    price: BigNumber;
    origLiquidity: BigNumber;
    normWeight: BigNumber;
}

async function tokenMetrics(
    bPool,
    tokens,
    tokenDecimals,
    prices,
    block
): Promise<TokenData[]> {
    let tokenData: TokenData[] = [];

    for (const token of tokens) {
        // Skip token if it doesn't have a price
        const hasPrice = !(
            prices[token] === undefined || prices[token].length === 0
        );
        if (!hasPrice) {
            continue;
        }
        let bTokenDecimals = tokenDecimals[token];

        let tokenBalanceWei = await bPool.methods
            .getBalance(token)
            .call(undefined, block.number);

        let normWeight = await bPool.methods
            .getNormalizedWeight(token)
            .call(undefined, block.number);

        // may be null if no tokens have been added
        let tokenBalance = scale(tokenBalanceWei || 0, -bTokenDecimals);
        let price = bnum(closestPrice(token, block.timestamp, prices));

        let origLiquidity = tokenBalance.times(price).dp(18);

        tokenData.push({
            token,
            origLiquidity,
            price,
            normWeight: scale(normWeight, -18),
        });
    }

    return tokenData;
}

export interface PoolDataBase {
    poolAddress: string;
    tokens: any[];
    liquidity: BigNumber;
    eligibleTotalWeight: BigNumber;
    bptSupply: BigNumber;
    feeFactor: BigNumber;
    liquidityProviders: string[];
    lpBalances: BigNumber[];
    controller: string;
}

interface NonstakingPool extends PoolDataBase {
    // has no pairs between BAL and an uncapped token
    canReceiveBoost: boolean;
}

interface ShareholderPool extends PoolDataBase {
    // contains pairs between BAL and uncapped tokens with exclusively shareholders
    canReceiveBoost: boolean;
}

interface NonshareholderPool extends PoolDataBase {
    // contains pairs between BAL and uncapped tokens with exclusively nonshareholders
    canReceiveBoost: boolean;
}

export interface SkipReason {
    privateSwap?: boolean;
    unpriceable?: boolean;
    notCreatedByBlock?: boolean;
}

export type PoolData = NonstakingPool | NonshareholderPool | ShareholderPool;

interface PoolFromSubgraph {
    id: string;
    createTime: number;
    controller: string;
    publicSwap: boolean;
    tokensList: string[];
    shareHolders: string[];
}

// THis method should return either [[allLPs]] or [[nonshareholders], [liquidityProviders]] depending on whether the pool needs to be split or not
export function splitLiquidityProviders(
    poolLiquidityProviders,
    poolTokens
): [string[]] | [string[], string[]] {
    let includesBal: boolean = poolTokens.includes(BAL_TOKEN);
    let includesUncappedTokenPair: boolean = poolTokens.reduce(
        (found, token) => {
            return (
                found || (token !== BAL_TOKEN && uncappedTokens.includes(token))
            );
        },
        false
    );

    if (includesBal && includesUncappedTokenPair) {
        const shareholderBlacklist = new Set(BLACKLISTED_SHAREHOLDERS);

        let shareHolderLiquidityProviders: string[] = poolLiquidityProviders.filter(
            (lp) => shareholderBlacklist.has(lp)
        );
        let nonshareholderLiquidityProviders: string[] = poolLiquidityProviders.filter(
            (lp) => !shareholderBlacklist.has(lp)
        );

        return [
            nonshareholderLiquidityProviders,
            shareHolderLiquidityProviders,
        ];
    }
    return [poolLiquidityProviders];
}

export interface PoolDataResult {
    pools: PoolData[];
}

export function getPoolBalances(
    bPool,
    blockNum,
    liquidityProviders
): Promise<BigNumber[]> {
    return Promise.all(
        liquidityProviders.map(async (lp) => {
            let userBalanceWei = await bPool.methods
                .balanceOf(lp)
                .call(undefined, blockNum);
            let userBalance = scale(userBalanceWei, -18);
            return userBalance;
        })
    );
}

export async function getPoolInvariantData(
    web3,
    prices,
    tokenDecimals,
    block,
    pool: PoolFromSubgraph,
    tokenCapFactors = {}
): Promise<PoolDataResult | SkipReason> {
    if (!poolCreatedByBlock(pool, block)) {
        return { notCreatedByBlock: true };
    }

    const bPool = new web3.eth.Contract(poolAbi, pool.id);

    const publicSwap = await bPool.methods
        .isPublicSwap()
        .call(undefined, block.number);

    if (!publicSwap) {
        return { privateSwap: true };
    }

    const currentTokens = await bPool.methods
        .getCurrentTokens()
        .call(undefined, block.number);

    let bptSupplyWei = await bPool.methods
        .totalSupply()
        .call(undefined, block.number);

    let bptSupply: BigNumber = scale(bptSupplyWei, -18);

    const poolTokens: string[] = currentTokens.map(
        web3.utils.toChecksumAddress
    );

    // If the pool is unpriceable, we cannot calculate any rewards
    if (!atLeastTwoTokensHavePrice(poolTokens, prices)) {
        return { unpriceable: true };
    }

    const poolLiquidityProviders: string[] = pool.shareHolders.map((lp) =>
        web3.utils.toChecksumAddress(lp)
    );
    // determine if the pool should be split up
    // based on pool and lp composition and get the balances of the providers in
    // the pool
    const subpoolLiquidityProviders:
        | [string[]]
        | [string[], string[]] = splitLiquidityProviders(
        poolLiquidityProviders,
        poolTokens
    );

    // bpt held by each lp
    const subpoolBalances: BigNumber[][] = await Promise.all(
        subpoolLiquidityProviders.map((lps: string[]) =>
            getPoolBalances(bPool, block.number, lps)
        )
    );

    // total bpt held by nonshareholders, shareholders
    const subpoolTotalBalances = subpoolBalances.map((spBals) =>
        spBals.reduce((sum, bal) => sum.plus(bal), bnum(0))
    );

    const subpoolWeights = subpoolTotalBalances.map((totalSubpoolBpt) =>
        bptSupplyWei > 0
            ? // TOTAL
              totalSubpoolBpt.div(bptSupply)
            : // if bptSupply is 0 in the case of a private pool, sum to 1
              bnum(1).div(subpoolLiquidityProviders.length)
    );

    // calculate these values for both subpools if relevant
    const tokenData = await tokenMetrics(
        bPool,
        poolTokens,
        tokenDecimals,
        prices,
        block
    );

    // Sum of of the USD value of all tokens in the pool
    const originalPoolLiquidity = tokenData.reduce(
        (a, t) => a.plus(t.origLiquidity),
        bnum(0)
    );

    const eligibleTotalWeight = tokenData.reduce(
        (a, t) => a.plus(t.normWeight),
        bnum(0)
    );

    const normWeights = tokenData.map((t) => t.normWeight);

    let poolFee = await bPool.methods
        .getSwapFee()
        .call(undefined, block.number);
    poolFee = scale(poolFee, -16); // -16 = -18 * 100 since it's in percentage terms
    const feeFactor = bnum(getFeeFactor(poolFee));

    let commonFactors = {
        poolAddress: pool.id,
        controller: pool.controller,
        tokens: tokenData,
        feeFactor,
        eligibleTotalWeight,
        normWeights,
        bptSupply,
    };
    if (subpoolLiquidityProviders.length == 1) {
        // single pool

        let lpBalances = subpoolBalances[0];
        let nonstakingPool: NonstakingPool = {
            ...commonFactors,
            canReceiveBoost: false,
            liquidityProviders: pool.shareHolders,
            liquidity: originalPoolLiquidity,
            eligibleTotalWeight,
            lpBalances,
        };
        return { pools: [nonstakingPool] };
    } else {
        // split into subpools
        let pools: (ShareholderPool | NonshareholderPool)[] = [];

        let hasNonshareholderPool: boolean =
            subpoolLiquidityProviders[0].length > 0;
        if (hasNonshareholderPool) {
            const liquidity = originalPoolLiquidity.times(subpoolWeights[0]);
            pools.push({
                ...commonFactors,
                canReceiveBoost: true,
                liquidityProviders: subpoolLiquidityProviders[0],
                lpBalances: subpoolBalances[0],
                liquidity,
            });
        }

        let hasShareholderPool: boolean =
            subpoolLiquidityProviders[1].length > 0;
        if (hasShareholderPool) {
            const liquidity = originalPoolLiquidity.times(subpoolWeights[1]);
            pools.push({
                ...commonFactors,
                canReceiveBoost: false,
                liquidityProviders: subpoolLiquidityProviders[1],
                lpBalances: subpoolBalances[1],
                liquidity,
            });
        }

        return { pools };
    }
}

interface PoolVariantFactors {
    balAndRatioFactor: BigNumber;
    adjustedPoolLiquidity: BigNumber;
    wrapFactor: BigNumber;
}

// This is data that is not intrinsic to the pool but depends on
// a particular balMultiplier and tokenCapFactor
export function getPoolVariantData(
    poolData,
    balMultiplier,
    tokenCapFactors = {}
): PoolVariantFactors {
    const { liquidity, feeFactor, tokens, normWeights } = poolData;

    const tokenAddresses = tokens.map((t) => t.token);
    const balAndRatioFactor = getBalAndRatioFactor(
        tokenAddresses,
        normWeights,
        balMultiplier
    );

    const tokenCapFactorArray = tokenAddresses.map(
        (address) => tokenCapFactors[address] || bnum(1.0)
    );
    const tokenCapAdjustedWeights = normWeights.map((weight, idx) =>
        weight.times(tokenCapFactorArray[idx])
    );

    // We need to adjust pool liquidity by a factor that recognizes the new
    // weights after some token liquidity is capped
    const poolTokenCapsFactor = tokenCapAdjustedWeights.reduce(
        (aggregator, tcaw) => aggregator.plus(tcaw),
        bnum(0)
    );

    const wrapFactor = getWrapFactor(tokenAddresses, tokenCapAdjustedWeights);

    const adjustedPoolLiquidity = feeFactor
        .times(balAndRatioFactor)
        .times(wrapFactor)
        .times(poolTokenCapsFactor)
        .times(liquidity)
        .dp(18);

    return {
        balAndRatioFactor,
        adjustedPoolLiquidity,
        wrapFactor,
    };
}

export function poolLiquidity(tokenCapFactors, tokens): BigNumber {
    return tokens.reduce((aggregateAdjustedLiquidity, t) => {
        let tokenCapFactor = tokenCapFactors[t.token];
        let adjustedTokenLiquidity = t.origLiquidity
            .times(tokenCapFactor)
            .dp(18);
        return aggregateAdjustedLiquidity.plus(adjustedTokenLiquidity);
    }, bnum(0));
}
