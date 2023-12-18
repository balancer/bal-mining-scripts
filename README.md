<h1 align=center><code>BAL Mining</code></h1>

Set of scripts to calculate weekly BAL liquidity mining distributions..

On week 26, the process was ported over to Python with the [blockchain-etl](https://github.com/blockchain-etl/) project on Google Bigquery as the source for state data, such as pools' balances, fees, liquidity providers etc. The legacy scripts used up to week 25 can be found in the `js` directory.

## [Historical Runs](https://github.com/balancer-labs/bal-mining-scripts/blob/aca467d/README.md#historical-runs)

## [Reports](https://github.com/balancer-labs/bal-mining-scripts/tree/master/reports)

Starting on week 57 of the liquidity mining program (June 28th 2021), pools can be incentivized with multiple tokens. Each weekly report directory has the following structure:

-   `__<network>_<token>.json` files, containing a list of liquidity providers and the amount of `<token>` earned by each for providing liquidity in incentivized Balancer pools on `<network>`
-   `_totalsLiquidityMining.json`: for consistency with the reports provided in previous weeks, contains a list of liquidity providers and `BAL` earned across all networks
-   `_gasResimbursement.json`: results of the _BAL for Gas_ program for the week, if applicable
-   `_totals.json`: total amount of `BAL` to be claimed on Ethereum mainnet (`__ethereum_0xba1...` + `_gasResimbursement.json`)

## Requirements

-   Python 3
-   A [service account key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#iam-service-account-keys-create-console) with read access to Google BigQuery

## Setup

-   Install required packages: `pip install -r requirements.txt`
-   Configure environment variable:
    -   `GOOGLE_APPLICATION_CREDENTIALS`: path to a JSON file that contains a service account key with read access to Google BigQuery

## Usage

`python3 run.py`

## Weekly distributions

145,000 BAL will be distributed on a weekly basis.  
Liquidity providers must claim their BAL at [app.balancer.fi](https://app.balancer.fi/), [polygon.balancer.fi](https://polygon.balancer.fi/) or [arbitrum.balancer.fi](https://arbitrum.balancer.fi/).

## Redirections

In case smart contracts which cannot receive tokens are liquidity providers (ie. hold the tokens that represent ownership of the pool), owners of those smart contracts can choose to redirect their liquidity mining incentives to a new address. In order to submit a redirection request, submit a pull request to update `config/redirect.json` using `"fromAddress" : "toAddress"` along with some sort of ownership proof. Please reach out to the Balancer team if you need assistance.

## Opting out

Liquidity providers can choose to opt out of liquidity mining incentives. In order to do so, they must submit a pull request as per the instructions below along with some sort of proof of ownership of the address. Please reach out to the Balancer team if you need assistance.

### Opting out of specific pools

Add your address to the file `config/exclude.json`, which has the following structure;

```
{
  "chain_id": {
    "pool_address": [
      "liquidity_provider_a",
      "liquidity_provider_b",
      ...
    ],
    ...
  },
  ...
}
```

### Opting out of liquidity mining altogether

Add your address to `BASE_LP_EXCLUSION_LIST` in `src/query_gbq.py`

```
BASE_LP_EXCLUSION_LIST = [
    '0x0000000000000000000000000000000000000000',
    '0xba12222222228d8ba445958a75a0704d566bf2c8'.
    '<insert_address_here>'
]
```
