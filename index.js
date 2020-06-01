const Web3 = require('web3');

const utils = require('./utils');
const poolAbi = require('./abi/BPool.json');
const tokenAbi = require('./abi/BToken.json');

const web3 = new Web3(new Web3.providers.WebsocketProvider(`wss://mainnet.infura.io/ws/v3/${process.env.INFURA_ID}`));
// const END_BLOCK = 10054130;
const END_BLOCK = 10000065; // Closest block to reference time at end of week
const START_BLOCK = 10000000; // Closest block to reference time at beginning of week
const TOTAL_BAL_DISTRIBUTED_PER_WEEK = 145000;
const NUMBER_BLOCKS_PER_SNAPSHOT = 64;
const TOTAL_BAL_DISTRIBUTED_PER_SNAPSHOT_BLOCK = TOTAL_BAL_DISTRIBUTED_PER_WEEK / Math.ceil((END_BLOCK - START_BLOCK)/64); // Ceiling because it includes end block

async function getRewardsAtBlock(i) {
    let totalBalancerLiquidity = 0;
    // const pools = await utils.fetchPublicSwapPools(); 

    let pools = await utils.fetchPublicSwapPools(); 
    pools = pools.slice(0, 60); // Slicing just for testing;

    console.log(pools);

    const allTokens = pools.flatMap(a => a.tokensList);


    const prices = await utils.fetchTokenPrices(allTokens)

    console.log('prices' +JSON.stringify(prices));    

    let userPools = {};
    let userLiquidity = {};

    for (const pool of pools) {

        let poolAddress = pool.id;
        console.log(`pool ${poolAddress}`)

        // Check if at least two tokens have a price
        let atLeastTwoTokensHavePrice = false;
        let nTokensHavePrice = 0;
        for (const t of pool.tokensList) {
            if (prices[t] !== undefined) {
                nTokensHavePrice ++;
                if(nTokensHavePrice>1){
                    atLeastTwoTokensHavePrice = true;
                    break;
                }
            }    
        }
        if (!atLeastTwoTokensHavePrice) {
            continue;
        }

        let bPool = new web3.eth.Contract(poolAbi, poolAddress);

        let shareHolders = pool.shares.flatMap(a => a.userAddress.id);

        let poolMarketCap = 0;

        let block = await web3.eth.getBlock(i);
        if (pool.createTime > block.timestamp) continue;

        for (const t of pool.tokensList) {
            // Skip token if it doesn't have a price
            if (prices[t] === undefined){
                console.log("skipping token because no price: "+t)
                continue;
            }
            let bToken = new web3.eth.Contract(tokenAbi, t);
            let tokenBalanceWei = await bPool.methods.getBalance(t).call(undefined, i);
            let tokenDecimals = await bToken.methods.decimals().call();
        
            let tokenBalance = utils.scale(tokenBalanceWei, -tokenDecimals);
            let tokenMarketCap = tokenBalance * prices[t]
            console.log(`  token ${t} balance ${tokenBalance} tokenMarketCap ${tokenMarketCap}`)
            poolMarketCap += tokenMarketCap
        };
        console.log(`    poolMarketCap  ${poolMarketCap}`)

        let poolFee = await bPool.methods.getSwapFee().call(undefined, i);
        poolFee = utils.scale(poolFee, -16); // -16 = -18 * 100 since it's in percentage terms
        
        console.log(`    poolFee  ${poolFee}`)

        poolMarketCap = getFeeFactor(poolFee) * poolMarketCap;
        totalBalancerLiquidity += poolMarketCap
        console.log(`    feeFactor  ${getFeeFactor(poolFee)}`)
        console.log(`    poolMarketCapAfterFeeFactor  ${poolMarketCap}`)

        let bptSupplyWei = await bPool.methods.totalSupply().call(undefined, i);
        let bptSupply = utils.scale(bptSupplyWei, -18);


        if (bptSupply == 0) { // Private pool
            if (userPools[pool.controller]) {
                userPools[pool.controller].push({ address: poolAddress, value: poolMarketCap })
            } else {
                userPools[pool.controller] = [{ address: poolAddress, value: poolMarketCap }]
            }
            
        } else { // Shared pool
            for (const holder of shareHolders) {
                let userBalanceWei = await bPool.methods.balanceOf(holder).call(undefined, i);
                let userBalance = utils.scale(userBalanceWei, -18);
                let userPoolValue = (userBalance / bptSupply) * poolMarketCap
                console.log(`    holder ${holder} - value ${userPoolValue}`)

                // Log pool address and how much liquidity this user has in it
                if (userPools[holder]) {
                    userPools[holder].push({ address: poolAddress, value: userPoolValue })
                } else {
                    userPools[holder] = [{ address: poolAddress, value: userPoolValue }]
                }

                // Add this pool liquidity to total user liquidity
                if (userLiquidity[holder]) {
                    userLiquidity[holder] += userPoolValue;
                } else {
                    userLiquidity[holder] = userPoolValue;
                }
            }
        }
    }

    // Final iteration across all users to calculate their BAL tokens for this block
    let userBalReceived = {};
    let balDistributedDoubleCheck = 0;
    for (const user in userLiquidity){
        userBalReceived[user] = userLiquidity[user] * TOTAL_BAL_DISTRIBUTED_PER_SNAPSHOT_BLOCK / totalBalancerLiquidity;
        balDistributedDoubleCheck += userBalReceived[user];
    }

    console.log(`balDistributedDoubleCheck: ${balDistributedDoubleCheck};    TOTAL_BAL_DISTRIBUTED_PER_SNAPSHOT_BLOCK: ${TOTAL_BAL_DISTRIBUTED_PER_SNAPSHOT_BLOCK}`);

    console.log("userBalReceived")
    console.log(userBalReceived)

    return [userPools, userBalReceived];
}

(async function() {

    for (i = END_BLOCK; i > START_BLOCK; i -= NUMBER_BLOCKS_PER_SNAPSHOT) {
        console.log(`Analizing BLOCK:  ${i}`)
        let blockRewards = await getRewardsAtBlock(i);

        utils.writeData(blockRewards, i)
    }
    

})()

function getFeeFactor(feePercentage){
    return Math.exp(-Math.pow(feePercentage/2,2));
}










