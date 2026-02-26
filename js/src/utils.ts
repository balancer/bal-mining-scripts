require('dotenv').config();
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

const ENDPOINT = process.env.ENDPOINT_URL || 'ws://localhost:8546';

const web3 = new Web3(new Web3.providers.WebsocketProvider(ENDPOINT));

BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    DECIMAL_PLACES: 18,
});

export function bnum(val) {
    return new BigNumber(val.toString());
}

const MARKET_API_URL =
    process.env.MARKET_API_URL || 'https://api.coingecko.com/api/v3';

export const scale = (input, decimalPlaces) => {
    const scalePow = new BigNumber(decimalPlaces);
    const scaleMul = new BigNumber(10).pow(scalePow);
    return new BigNumber(input).times(scaleMul);
};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWhitelist() {
    const response = await fetch(
        `https://raw.githubusercontent.com/balancer-labs/assets/master/lists/eligible.json`,
        {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        }
    );

    let whitelistResponse = await response.json();
    return whitelistResponse.homestead;
}

export async function fetchTokenPrices(
    allTokens,
    startTime,
    endTime,
    priceProgress
) {
    let prices = {};

    for (let tokenAddress of Object.keys(allTokens)) {
        const address = tokenAddress
            ? web3.utils.toChecksumAddress(tokenAddress)
            : null;
        if (!address) continue;
        const query = `coins/ethereum/contract/${address}/market_chart/range?&vs_currency=usd&from=${startTime}&to=${endTime}`;

        const response = await fetch(`${MARKET_API_URL}/${query}`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });

        let priceResponse = await response.json();
        prices[address] = priceResponse.prices;
        priceProgress.increment();
        // Sleep between requests to prevent rate-limiting
        await sleep(1000);
    }
    priceProgress.stop();

    return prices;
}
