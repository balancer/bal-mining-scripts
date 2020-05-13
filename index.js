const Web3 = require('web3');

const utils = require('./utils');
const poolAbi = require('./abi/BPool.json');
const tokenAbi = require('./abi/BToken.json');

const web3 = new Web3(new Web3.providers.WebsocketProvider(`wss://mainnet.infura.io/ws/v3/${process.env.INFURA_ID}`));
const START_BLOCK = 10000000;
const END_BLOCK = 10054130;


async function getRewardsAtBlock(i) {
    
    const pools = await utils.fetchPublicSwapPools();

    const allTokens = pools.flatMap(a => a.tokensList);
    const prices = await utils.fetchTokenPrices(allTokens)

    let userPools = {};

    for (const pool of pools) {

        let poolAddress = pool.id;
        console.log(`pool ${poolAddress}`)

        let allTokensHavePrice = true;
        pool.tokensList.forEach(t => {
            if (prices[t] === undefined) {
                allTokensHavePrice = false;
            }
        });
        if (!allTokensHavePrice) {
            continue;
        }

        let bPool = new web3.eth.Contract(poolAbi, poolAddress);

        let shareHolders = pool.shares.flatMap(a => a.userAddress.id);

        let poolMarketCap = 0;

        let block = await web3.eth.getBlock(i);
        if (pool.createTime > block.timestamp) continue;

        for (const t of pool.tokensList) {
            let bToken = new web3.eth.Contract(tokenAbi, t);
            let tokenBalanceWei = await bPool.methods.getBalance(t).call(undefined, i);
            let tokenDecimals = await bToken.methods.decimals().call();
        
            let tokenBalance = utils.scale(tokenBalanceWei, -tokenDecimals);
            let tokenMarketCap = tokenBalance * prices[t]
            console.log(`  token ${t} ${tokenBalance} ${tokenMarketCap}`)
            poolMarketCap += tokenMarketCap
        };
        console.log(`  ${poolMarketCap}`)

        let bptSupplyWei = await bPool.methods.totalSupply().call(undefined, i);
        let bptSupply = utils.scale(bptSupplyWei, -18);

        if (bptSupply == 0) {
            if (userPools[pool.controller]) {
                userPools[pool.controller].push({ address: poolAddress, value: poolMarketCap })
            } else {
                userPools[pool.controller] = [{ address: poolAddress, value: poolMarketCap }]
            }
            
        } else {
            for (const holder of shareHolders) {
                let userBalanceWei = await bPool.methods.balanceOf(holder).call(undefined, i);
                let userBalance = utils.scale(userBalanceWei, -18);
                let userValue = (userBalance / bptSupply) * poolMarketCap
                console.log(`    ${holder} - ${userValue}`)

                if (userPools[holder]) {
                    userPools[holder].push({ address: poolAddress, value: userValue })
                } else {
                    userPools[holder] = [{ address: poolAddress, value: userValue }]
                }
            }
        }
        
    }

    return userPools;
}

(async function() {

    for (i = START_BLOCK; i <= END_BLOCK; i + 100) {
        let blockRewards = await getRewardsAtBlock(i);

        utils.writeData(blockRewards, i)

    }
    

})()