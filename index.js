const Web3 = require('web3');

const utils = require('./utils');
const poolAbi = require('./abi/BPool.json');
const tokenAbi = require('./abi/BToken.json');

const web3 = new Web3(new Web3.providers.WebsocketProvider(`wss://mainnet.infura.io/ws/v3/${process.env.INFURA_ID}`));
// const END_BLOCK = 10054130;
const END_BLOCK = 10176690; // Closest block to reference time at end of week
// 10176690 - 1590969601
// 10131642 - 1590364791 - Sun, 24 May 2020 23:59:51 GMT
const START_BLOCK = 10131642; // Closest block to reference time at beginning of week
const BAL_PER_WEEK = 145000;
const BLOCKS_PER_SNAPSHOT = 64;
const BAL_PER_SNAPSHOT = BAL_PER_WEEK / Math.ceil((END_BLOCK - START_BLOCK)/64); // Ceiling because it includes end block

async function getRewardsAtBlock(i, pools, prices) {
    let totalBalancerLiquidity = 0;

    let block = await web3.eth.getBlock(i);

    let userPools = {};
    let userLiquidity = {};

    for (const pool of pools) {

        let poolAddress = pool.id;
        console.log(`pool ${poolAddress}`)

        // Check if at least two tokens have a price
        let atLeastTwoTokensHavePrice = false;
        let nTokensHavePrice = 0;
        for (const t of pool.tokensList) {
            if (prices[t] !== undefined && prices[t].length > 0) {
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

        if (pool.createTime > block.timestamp) continue;

        for (const t of pool.tokensList) {
            // Skip token if it doesn't have a price
            if (prices[t] === undefined || prices[t].length === 0) {
                console.log("skipping token because no price: "+t)
                continue;
            }
            let bToken = new web3.eth.Contract(tokenAbi, t);
            let tokenBalanceWei = await bPool.methods.getBalance(t).call(undefined, i);
            let tokenDecimals = await bToken.methods.decimals().call();
        
            let closestPrice = prices[t].reduce((a, b) => {
                return (Math.abs(b[0] - block.timestamp) < Math.abs(a[0] - block.timestamp) ? b : a);
            })[1];
            let tokenBalance = utils.scale(tokenBalanceWei, -tokenDecimals);
            let tokenMarketCap = tokenBalance * closestPrice
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
        userBalReceived[user] = userLiquidity[user] * BAL_PER_SNAPSHOT / totalBalancerLiquidity;
        balDistributedDoubleCheck += userBalReceived[user];
    }

    console.log(`balDistributedDoubleCheck: ${balDistributedDoubleCheck};    BAL_PER_SNAPSHOT: ${BAL_PER_SNAPSHOT}`);

    console.log("userBalReceived")
    console.log(userBalReceived)

    return [userPools, userBalReceived];
}

(async function() {

    let pools = await utils.fetchPublicSwapPools();
    const allTokens = pools.flatMap(a => a.tokensList);
    const prices = await utils.fetchTokenPrices(allTokens, 1590364791, 1590969601); 

    for (i = END_BLOCK; i > START_BLOCK; i -= BLOCKS_PER_SNAPSHOT) {
        console.log(`Calculating for BLOCK:  ${i}`)
        let blockRewards = await getRewardsAtBlock(i, pools, prices);

        utils.writeData(blockRewards, i)
    }
    

})()

function getFeeFactor(feePercentage){
    return Math.exp(-Math.pow(feePercentage/2,2));
}










