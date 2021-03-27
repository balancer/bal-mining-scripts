require('dotenv').config();
const fleek = require('@fleekhq/fleek-storage-js');
const requireContext = require('require-context');

const network = process.env.NETWORK || 'mainnet';

const config = {
    apiKey: process.env.FLEEK_API_KEY,
    apiSecret: process.env.FLEEK_API_SECRET,
    bucket: 'balancer-team-bucket',
};

const networkStr = network === 'kovan' ? '-kovan' : '';
const NAMESPACE = `balancer-claim${networkStr}`;
const SNAPSHOT_KEY = `${NAMESPACE}/snapshot`;

async function getSnapshot() {
    const input = config;
    input.key = SNAPSHOT_KEY;
    input.getOptions = ['data'];
    const result = await fleek.get(input);
    return JSON.parse(result.data.toString());
}

async function uploadJson(key, body) {
    const input = config;
    input.key = key;
    input.data = JSON.stringify(body);
    const result = await fleek.upload(input);
    return {
        key,
        ipfsHash: result.hashV0,
    };
}

const offsetMainnet = 20;
const requireFile = requireContext(
    `../../reports${networkStr}`,
    true,
    /_totals.json$/
);
const files = Object.fromEntries(
    requireFile
        .keys()
        .map((fileName) => [
            fileName.replace('/_totals.json', ''),
            requireFile(fileName),
        ])
        .filter(
            (file) => network === 'mainnet' && parseInt(file[0]) > offsetMainnet
        )
        .map((file) =>
            network === 'mainnet'
                ? [(parseInt(file[0]) - offsetMainnet).toString(), file[1]]
                : file
        )
);

console.log(Object.keys(files));

(async () => {
    const snapshot = await getSnapshot();
    console.log('Last snapshot', snapshot);

    const promises = [];
    Object.entries(files).forEach(([week, file]) => {
        if (!snapshot[week]) {
            console.log(`Publish week ${week}`);
            const key = `${NAMESPACE}/reports/${week}`;
            promises.push(uploadJson(key, file));
        }
    });

    if (promises.length === 0) {
        console.log('Already updated');
        return;
    }

    try {
        await Promise.all(promises).then((result) => {
            result.forEach((upload) => {
                const week = upload.key.replace(`${NAMESPACE}/reports/`, '');
                snapshot[week] = upload.ipfsHash;
            });
        });
        const snapshotUpload = await uploadJson(SNAPSHOT_KEY, snapshot);
        console.log('Successfully published', snapshotUpload);
    } catch (e) {
        console.error(e);
    }
})();
