require('dotenv').config()
const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.WebsocketProvider(`wss://mainnet.infura.io/ws/v3/${process.env.INFURA_ID}`));

(async function() {

    for (let i = 10131594; i < 10138872; i++) {
        let block = await web3.eth.getBlock(i);
        console.log(`${i} - ${block.timestamp} - ${(new Date(block.timestamp * 1000)).toUTCString()}`)
    }
    
})()

