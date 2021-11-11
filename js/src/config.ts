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
    'homestead-union': {
        reportsDirectory: `../reports/`,
        reportFilename:
            '__ethereum_0x226f7b842e0f0120b7e194d05432b3fd14773a9d.json',
        jsonSnapshotFilename: '_current-union.json',
        fleekNamespace: 'balancer-claims-union',
        offset: 71,
    },
    'homestead-bankless': {
        reportsDirectory: `../reports/`,
        reportFilename:
            '__ethereum_0x2d94aa3e47d9d5024503ca8491fce9a2fb4da198.json',
        jsonSnapshotFilename: '_current-bankless.json',
        fleekNamespace: 'balancer-claims-bankless',
        offset: 74,
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
    'arbitrum-pickle': {
        reportsDirectory: `../reports/`,
        reportFilename:
            '__arbitrum_0x965772e0e9c84b6f359c8597c891108dcf1c5b1a.json',
        jsonSnapshotFilename: '_current-pickle-arbitrum.json',
        fleekNamespace: 'balancer-claims-pickle-arbitrum',
        offset: 69,
    },
    polygon: {
        reportsDirectory: `../reports/`,
        reportFilename:
            '/__polygon_0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3.json',
        jsonSnapshotFilename: '_current-polygon.json',
        fleekNamespace: 'balancer-claims-polygon',
        offset: 71,
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
