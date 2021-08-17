const fleek = require('@fleekhq/fleek-storage-js');

interface FleekConfig {
    apiKey: string;
    apiSecret: string;
    bucket: string;
    key?: string;
    data?: string;
    getOptions?: any;
}

const fleekConfig: FleekConfig = {
    apiKey: process.env.FLEEK_API_KEY,
    apiSecret: process.env.FLEEK_API_SECRET,
    bucket: 'balancer-team-bucket',
};

async function getSnapshot(snapshotKey) {
    const input = fleekConfig;
    input.key = snapshotKey;
    input.getOptions = ['data'];
    const result = await fleek.get(input);
    return JSON.parse(result.data.toString());
}

async function uploadJson(key, body) {
    const input = fleekConfig;
    input.key = key;
    input.data = JSON.stringify(body);
    const result = await fleek.upload(input);
    return {
        key,
        ipfsHash: result.hashV0,
    };
}

module.exports = {
    getSnapshot,
    uploadJson,
};
