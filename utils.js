require('dotenv').config();
const fs = require('fs');
const cliProgress = require('cli-progress');
const fetch = require('isomorphic-fetch');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');

const web3 = new Web3(
    new Web3.providers.WebsocketProvider(`ws://localhost:8546`)
);

const SUBGRAPH_URL =
    process.env.SUBGRAPH_URL ||
    'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer';
const MARKET_API_URL =
    process.env.MARKET_API_URL || 'https://api.coingecko.com/api/v3';

const scale = (input, decimalPlaces) => {
    const scalePow = new BigNumber(decimalPlaces);
    const scaleMul = new BigNumber(10).pow(scalePow);
    return new BigNumber(input).times(scaleMul);
};

const writeData = (data, path) => {
    try {
        fs.writeFileSync(
            `./reports/${path}.json`,
            JSON.stringify(data, null, 4)
        );
    } catch (err) {
        console.error(err);
    }
};

async function fetchAllPools() {
    const query = `
        {
          pools (first: 1000) {
            id
            publicSwap
            swapFee
            controller
            createTime
            tokensList
            totalShares
            shares (first: 1000) {
              userAddress {
                id
              }
            }
          }
        }
    `;

    const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query,
        }),
    });

    const { data } = await response.json();

    return data.pools;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWhitelist() {
    const response = await fetch(
        `https://raw.githubusercontent.com/balancer-labs/pool-management/master/src/deployed.json`,
        {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        }
    );

    let whitelistResponse = await response.json();
    whitelist = whitelistResponse.mainnet.tokens
        .slice(1)
        .flatMap((a) => a.address);

    return whitelist;
}

async function fetchTokenPrices(allTokens, startTime, endTime, priceProgress) {
    let prices = {};
    for (j in allTokens) {
        const address = allTokens[j]
            ? web3.utils.toChecksumAddress(allTokens[j])
            : null;
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
        // Sleep half a second between requests to prevent rate-limiting
        await sleep(500);
    }
    priceProgress.stop();

    return prices;
}

module.exports = {
    scale,
    writeData,
    fetchAllPools,
    fetchWhitelist,
    fetchTokenPrices,
};
