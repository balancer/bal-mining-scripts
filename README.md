<h1 align=center><code>BAL Mining</code></h1>

Set of scripts to calculate weekly BAL liquidity mining distributions. 

On week 26, the process was ported over to Python with the [blockchain-etl](https://github.com/blockchain-etl/) project on Google Bigquery as the  source for state data, such as pools' balances, fees, liquidity providers etc. The legacy scripts used up to week 25 can be found in the `js` directory.

## [Historical Runs](https://github.com/balancer-labs/bal-mining-scripts/blob/aca467d/README.md#historical-runs)

## [Reports](https://github.com/balancer-labs/bal-mining-scripts/tree/master/reports)
Starting on week 57 of the liquidity mining program (June 28th 2021), pools can be incentivized with multiple tokens. Each weekly report directory has the following structure:  
* `__<network>_<token>.json` files, containing a list of liquidity providers and the amount of `<token>` earned by each for providing liquidity in incentivized Balancer pools on `<network>`
* `_totalsLiquidityMining.json`: for consistency with the reports provided in previous weeks, contains a list of liquidity providers and `BAL` earned across all networks
* `_gasResimbursement.json`: results of the _BAL for Gas_ program for the week
* `_totals.json`: total amount of `BAL` to be claimed on Ethereum mainnet (`__ethereum_0xba1...` + `_gasResimbursement.json`)

## Requirements
* Python 3
* A [service account key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#iam-service-account-keys-create-console) with read access to Google BigQuery

## Setup
* Install required packages: `pip install -r requirements.txt`
* Configure environment variable:
  * `GOOGLE_APPLICATION_CREDENTIALS`: path to a JSON file that contains a service account key with read access to Google BigQuery and Nansen's Arbitrum data

## Usage
`python3 bal-mining.py`  
Will run the script for the week before the current one and save reports to `reports/<WEEK>`
### Optional Parameters
* `week`: what week number to run, eg `python3 bal-mining.py --week=75`
* `rt=1`: run realtime estimator, eg `python3 bal-mining.py --rt=1`;
  *  computes distributions for the current week
  *  instead of saving reports to disk, writes values to Google BigQuery

## Weekly distributions

145,000 BAL will be distributed on a weekly basis.  
Liquidity providers must claim their BAL at [app.balancer.fi](https://app.balancer.fi/),  [polygon.balancer.fi](https://polygon.balancer.fi/) or  [arbitrum.balancer.fi](https://arbitrum.balancer.fi/). 

## BAL Redirections

In case smart contracts which cannot receive BAL tokens are liquidity providers (ie. hold the tokens that represent ownership of the pool), owners of those smart contracts can choose to redirect BAL tokens to a new address. In order to submit a redirection request, submit a pull request to update `redirect.json` using `"fromAddress" : "toAddress"` along with some sort of ownership proof. Please reach out to the Balancer team if you need assistance.
