const Web3 = require('web3');
const fs = require('fs');
const utils = require('./utils');


(async function() {

    const userTotals = {};
    
    try {
        // Get all files in report directory
        const files = await fs.promises.readdir('./reports');

        files.forEach(file=> {
            const jsonString = fs.readFileSync(`./reports/${file}`)
            const report = JSON.parse(jsonString)[1];

            Object.keys(report).forEach(user => {
                if (userTotals[user]) {
                    userTotals[user] += report[user]
                } else {
                    userTotals[user] = report[user]
                }
            })

        })

        console.log(JSON.stringify(userTotals))
    }
    catch( e ) {
        console.error( "Error reading reports", e );
    }

})();
