require('dotenv').config()
const Web3 = require('web3');
const { argv } = require('yargs');

const web3 = new Web3(new Web3.providers.WebsocketProvider(`wss://mainnet.infura.io/ws/v3/${process.env.INFURA_ID}`));

(async function() {

    for (let i = argv.startBlock; i <= argv.endBlock; i++) {
        let block = await web3.eth.getBlock(i);
        console.log(`${i} - ${block.timestamp} - ${(new Date(block.timestamp * 1000)).toUTCString()}`)
    }
    
})()

