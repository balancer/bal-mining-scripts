import { loadTree } from './merkle';
import { soliditySha3 } from 'web3-utils';
const { argv } = require('yargs');
const { scale } = require('./utils');

const { recipient, decimals, balance } = argv;

const report = {};
report[recipient] = balance;

const merkleTree = loadTree(report, decimals || 18);
const root = merkleTree.getHexRoot();

const scaledBalance = scale(balance, decimals || 18);
const leaf = soliditySha3(recipient, scaledBalance);

console.log(`Migration tree to transfer tokens to ${recipient}`);
console.log('> Inputs:', { recipient, decimals, balance });
console.log(`> Scaled Balance: ${scaledBalance}`);
console.log(`> Root (same as leaf): ${merkleTree.getHexRoot()}`);
console.log(
    `> Proof is empty []?: ${merkleTree.getHexProof(leaf).length == 0}`
);
