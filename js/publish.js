require('dotenv').config();
const requireContext = require('require-context');
const fleekService = require('./lib/fleekService');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { config } = require('./lib/config');

async function getSnapshotFromFile(config) {
    const snapshotPath = config.reportsDirectory + config.jsonSnapshotFilename;
    const jsonString = fs.readFileSync(path.resolve(__dirname, snapshotPath));
    return JSON.parse(jsonString.toString());
}

// find all totals files in the directory structure (ie. ../../reports/<week*>/_totals.json)
function weeklyTotals(config) {
    console.log(config.reportsDirectory);
    const globCwd = path.resolve(__dirname, config.reportsDirectory);
    const filenamesOfTotals = glob.sync('./**/' + config.reportFilename, {
        cwd: globCwd,
    });

    const allWeeks = filenamesOfTotals.map((fileName) => [
        parseInt(fileName.split('/')[1]), // weekNumber
        JSON.parse(fs.readFileSync(path.resolve(globCwd, fileName)).toString()),
    ]);

    // Prior to week 20, mainnet rewards were distributed via
    // direct transfer and therefore are irrelevant to the merkle
    // redeem contract
    const weeksAfterOffset = Object.fromEntries(
        allWeeks
            .filter(([weekNum, _]) => weekNum > config.offset)
            .map(([weekNum, file]) => [
                (weekNum - config.offset).toString(),
                file,
            ])
    );

    return weeksAfterOffset;
}

(async () => {
    const snapshot = await getSnapshotFromFile(config);
    // OR read from fleek
    // const snapshot = await fleekService.getSnapshot(`${config.fleekNamespace}/snapshot`);

    console.log('Last snapshot', snapshot);

    const files = weeklyTotals(config);

    const promises = [];
    Object.entries(files).forEach(([week, file]) => {
        if (!snapshot[week]) {
            console.log(`Publish week ${week}`);
            const key = `${config.fleekNamespace}/reports/${week}`;

            promises.push(fleekService.uploadJson(key, file));
            // For testing without uploading to ipfs
            //  promises.push(
            //    new Promise((resolve, reject) => resolve({key, ipfsHash: '0x1234'}))
            //  );
        }
    });

    if (promises.length === 0) {
        console.log('Already updated');
        return;
    }

    try {
        await Promise.all(promises).then((result) => {
            result.forEach((upload) => {
                const week = upload.key.replace(
                    `${config.fleekNamespace}/reports/`,
                    ''
                );
                snapshot[week] = upload.ipfsHash;
            });
        });

        // Optionally upload snapshot to fleek
        // const snapshotUpload = await uploadJson(`${config.fleekNamespace}/reports/snapshot);
        // console.log('Successfully published', snapshotUpload);

        const snapshotPath = path.resolve(
            __dirname,
            config.reportsDirectory + config.jsonSnapshotFilename
        );
        console.log('New snapshot written to:', snapshotPath, snapshot);
        fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 4));
    } catch (e) {
        console.error(e);
    }
})();
