require('dotenv').config()
const fs = require('fs');
const fetch = require('isomorphic-fetch');
const BigNumber = require('bignumber.js');

const SUBGRAPH_URL = process.env.SUBGRAPH_URL || 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer';
const MARKET_API_URL = process.env.MARKET_API_URL || 'https://api.coingecko.com/api/v3';

const scale = (input, decimalPlaces) => {
    const scalePow = new BigNumber(decimalPlaces);
    const scaleMul = new BigNumber(10).pow(scalePow);
    return new BigNumber(input).times(scaleMul).toNumber();
}

const writeData = (data, path) => {
    try {
      fs.writeFileSync(`./reports/${path}.json`, JSON.stringify(data, null, 4))
    } catch (err) {
      console.error(err)
    }
}

async function fetchPublicSwapPools() {
    const query = `
        {
          pools (where: {publicSwap: true}) {
            id
            publicSwap
            swapFee
            controller
            createTime
            tokensList
            totalShares
            shares {
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
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTokenPrices(allTokens, startTime, endTime) {
    let prices = {}
    for (j in allTokens) {
        const address = allTokens[j];
        console.log(address)
        const query = `coins/ethereum/contract/${address}/market_chart/range?&vs_currency=usd&from=${startTime}&to=${endTime}`;

        const response = await fetch(`${MARKET_API_URL}/${query}`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });

        let priceResponse = await response.json();
        prices[address] = priceResponse.prices;
        await sleep(500)
    };

    return prices;
}

module.exports = { scale, writeData, fetchPublicSwapPools, fetchTokenPrices };