import * as liquidityMiningConfig from './config/liquidityMiningConfig.json';

const network = process.env.NETWORK || 'homestead'; // || 'kovan' || 'homestead-lido'
const config = liquidityMiningConfig[network];

module.exports = { liquidityMiningConfig, network, config };
