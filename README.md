<h1 align=center><code>BAL Mining</code></h1>

Set of scripts to calculate weekly BAL liquidity mining distributions

## Historical Runs

| Week                           | Start Block | End Block |
| :----------------------------- | ----------: | --------: |
| [1](/reports/1/_totals.json)   |    10176690 |  10221761 |
| [2](/reports/2/_totals.json)   |    10221761 |  10267003 |
| [3](/reports/3/_totals.json)   |    10267003 |  10312236 |
| [4](/reports/4/_totals.json)   |    10312236 |  10357402 |
| [5](/reports/5/_totals.json)   |    10357402 |  10402520 |
| [6](/reports/6/_totals.json)   |    10402520 |  10447836 |
| [7](/reports/7/_totals.json)   |    10447836 |  10493044 |
| [8](/reports/8/_totals.json)   |    10493044 |  10538187 |
| [9](/reports/9/_totals.json)   |    10538187 |  10583488 |
| [10](/reports/10/_totals.json) |    10583488 |  10622281 |

## Requirements

An archive node is needed to run the scripts because historical balance snapshots are needed. A "starting-point" archive node can also be used that will only archive at x block onwards. Note this still probably requires 750G+ of disk space.

## Usage

```
node index.js --week 1 --startBlock 10176690 --endBlock 10221761
node index.js --week 2 --startBlock 10221761 --endBlock 10267003
```

This will run run all historical calculations by block. Using an infura endpoint this may take upwards of 18 hours. For a local archive node, the sync time is roughly 10 minutes. Progress bars with estimates are shown during the sync. Reports will be saved in the folder for the given week specified

```
node sum.js --week 1 --startBlock 10176690 --endBlock 10221761
```

After all reports are generated, `sum.js` will create a final tally of user address to BAL received. This is stored in the report week folder at `_totals.json`

## Weekly distributions

145,000 BAL will be distributed directly to addresses on a weekly basis. Due to block gas limits, the tx's to batch transfer BAL will need to be split up across blocks. In order to prevent favoring certain accounts, the block hash of the `endBlock` will be the starting point and addresses will be ordered alphabetically for distributions.

## BAL Redirections

In case smart contracts which cannot receive BAL tokens are specified, owners of those smart contracts can choose to redirect BAL tokens to a new address. In order to submit a redirection request, submit a pull request to update `redirect.json` using `"fromAddress" : "toAddress"` along with some sort of ownership proof. Please reach out to the Balancer team if you need assistance.
