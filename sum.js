const Web3 = require('web3');
const fs = require('fs');
const utils = require('./utils');
const BigNumber = require('bignumber.js');
const { argv } = require('yargs');

function bnum(val) {
    return new BigNumber(val.toString());
}

const END_BLOCK = argv.endBlock; // Closest block to reference time at end of week
const START_BLOCK = argv.startBlock; // Closest block to reference time at beginning of week
const WEEK = argv.week;
const BLOCKS_PER_SNAPSHOT = 64;

(async function () {
    const userTotals = {};
    const userBal = {};

    let balTotal = bnum(0);

    try {
        // Get all files in report directory
        for (i = END_BLOCK; i > START_BLOCK; i -= BLOCKS_PER_SNAPSHOT) {
            const jsonString = fs.readFileSync(`./reports/${WEEK}/${i}.json`);
            const report = JSON.parse(jsonString)[1];

            Object.keys(report).forEach((user) => {
                balTotal = balTotal.plus(bnum(report[user]));
                if (userTotals[user]) {
                    userTotals[user] = bnum(userTotals[user])
                        .plus(bnum(report[user]))
                        .toString();
                } else {
                    userTotals[user] = report[user];
                }
            });
        }
        console.log(`Total BAL distributed ${balTotal.toString()}`);
        utils.writeData(userTotals, `${WEEK}/_totals`);
    } catch (e) {
        console.error('Error reading reports', e);
    }
})();
