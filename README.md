<h1 align=center><code>BAL Mining - incident response</code></h1>

In January 2023, Balancer Labs was notified of a bug in the MerkleOrchard contracts that were used to distribute token incentives before Balancer Protocol migrated to the new ve-tokenomics in 2022. [[1]](https://twitter.com/Balancer/status/1620503172702953475)

Funds were safely transferred to the Balancer DAO treasury to be later distributed by a patched MerkleOrchard contract.

This branch was specifically designed to repurpose the liquidity mining infrastructure so as to address the redistribution of said tokens.

For each token recovered from the Merkle Orchard, `run-incident.py` computes the unclaimed distributions belonging to each claimer and aggregates them. The aggregate amounts are output to `reports/_incident-response/1`, in `__<network>_<token>.json` files, containing a list of liquidity providers and the amount of `<token>` left for them to claim.

At the end, the script checks that the sum of all the amounts in each report is equal to the amounts recovered from the faulty Merkle Orchard.

```
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
arbitrum, 0x040d1edc9569d4bab2d15287dc5a4f10f56a56b8 check
17864.43303 recovered
17864.43303 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
arbitrum, 0x965772e0e9c84b6f359c8597c891108dcf1c5b1a check
2265.85941 recovered
2265.85941 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
ethereum, 0x226f7b842e0f0120b7e194d05432b3fd14773a9d check
1190799.41399 recovered
1190799.41399 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
ethereum, 0x2d94aa3e47d9d5024503ca8491fce9a2fb4da198 check
267578.13838 recovered
267578.13838 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
ethereum, 0x43d4a3cd90ddd2f8f4f693170c9c8098163502ad check
14891.48765 recovered
14891.48765 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
ethereum, 0x5a98fcbea516cf06857215779fd812ca3bef1b32 check
287507.81357 recovered
287507.81357 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
ethereum, 0xba100000625a3754423978a60c9317c58a424e3d check
296749.18133 recovered
296749.18133 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
ethereum, 0xcfeaead4947f0705a14ec42ac3d44129e1ef3ed5 check
53281.96362 recovered
53281.96362 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
polygon, 0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270 check
23488.53485 recovered
23488.53485 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
polygon, 0x2e1ad108ff1d8c782fcbbb89aad783ac49586756 check
43359.51599 recovered
43359.51598 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
polygon, 0x580a84c73811e1839f75d86d75d88cca0c241ff4 check
9067.62018 recovered
9067.62018 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
polygon, 0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3 check
33852.28964 recovered
33852.28964 redistributed

-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
polygon, 0xc3c7d422809852031b44ab29eec9f1eff2a58756 check
462.47457 recovered
462.47457 redistributed
```

`liquidityMiningConfig.json` and the GitHub workflow files have been updated so that:

1. merkle roots are computed from the incident reports and saved to `reports/_incident-response/_roots-*.json`
2. incident reports are published to IPFS and manifests are saved to `reports/_incident-response/_current-*.json`

With this, the existing claim UI can be easily repurposed to enable claims of the redistributed funds.

## Requirements

-   Python 3

## Setup

-   Install required packages: `pip install -r requirements.txt`

## Usage

`python3 run-incident.py`
