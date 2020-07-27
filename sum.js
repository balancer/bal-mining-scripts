const Web3 = require('web3');
const fs = require('fs');
const utils = require('./utils');
const BigNumber = require('bignumber.js');
const { argv } = require('yargs');

BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    DECIMAL_PLACES: 18,
});

function bnum(val) {
    return new BigNumber(val.toString());
}

const END_BLOCK = argv.endBlock; // Closest block to reference time at end of week
const START_BLOCK = argv.startBlock; // Closest block to reference time at beginning of week
const WEEK = argv.week;
const BLOCKS_PER_SNAPSHOT = 256;

(async function () {
    let userTotals = {};
    let sortedUserTotal = {};
    let userBal = {};

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

        const jsonRedirect = fs.readFileSync(`./redirect.json`);
        const redirects = JSON.parse(jsonRedirect);

        Object.keys(userTotals).forEach((user) => {
            if (userTotals[user] == 0) {
                delete userTotals[user];
            }

            if (redirects[user]) {
                let newAddress = redirects[user];
                userTotals[newAddress] = userTotals[user];
                delete userTotals[user];
            }
        });

        Object.entries(userTotals)
            .sort((a, b) => a[0] - b[0])
            .forEach(([key, val]) => {
                sortedUserTotal[key] = val;
            });
        console.log(`Total BAL distributed ${balTotal.toString()}`);
        utils.writeData(sortedUserTotal, `${WEEK}/_totals`);
    } catch (e) {
        console.error('Error reading reports', e);
    }
})();
