const liquidityMiningConfig = {
    homestead: {
        reportsDirectory: `../reports/`,
        reportFilename: '_totals.json',
        jsonSnapshotFilename: '_current.json',
        fleekNamespace: 'balancer-claims',
        offset: 20,
    },
    'homestead-lido': {
        reportsDirectory: `../reports/`,
        reportFilename:
            '__ethereum_0x5a98fcbea516cf06857215779fd812ca3bef1b32.json',
        jsonSnapshotFilename: '_current-lido.json',
        fleekNamespace: 'balancer-claims-lido',
        offset: 63,
    },
    'homestead-vita': {
        reportsDirectory: `../reports/`,
        reportFilename:
            '__ethereum_0x81f8f0bb1cb2a06649e51913a151f0e7ef6fa321.json',
        jsonSnapshotFilename: '_current-vita.json',
        fleekNamespace: 'balancer-claims-vita',
        offset: 67,
    },
    arbitrum: {
        reportsDirectory: `../reports/`,
        reportFilename:
            '/__arbitrum_0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8.json',
        jsonSnapshotFilename: '_current-arbitrum.json',
        fleekNamespace: 'balancer-claims-arbitrum',
        offset: 66,
    },
    'arbitrum-mcdex': {
        reportsDirectory: `../reports/`,
        reportFilename:
            '__arbitrum_0x4e352cf164e64adcbad318c3a1e222e9eba4ce42.json',
        jsonSnapshotFilename: '_current-mcdex-arbitrum.json',
        fleekNamespace: 'balancer-claims-mcdex-arbitrum',
        offset: 68,
    },
    kovan: {
        reportsDirectory: `../reports-kovan/`,
        reportFilename: '_totals.json',
        jsonSnapshotFilename: '_current.json',
        fleekNamespace: 'balancer-claims-kovan',
        offset: 0,
    },
};

const network = process.env.NETWORK || 'homestead'; // || 'kovan' || 'homestead-lido'
const config = liquidityMiningConfig[network];

module.exports = { liquidityMiningConfig, network, config };
