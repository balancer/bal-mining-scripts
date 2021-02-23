<h1 align=center><code>BAL Mining</code></h1>

Set of scripts to calculate weekly BAL liquidity mining distributions. 

On week 26, the process was ported over to Python with the [blockchain-etl](https://github.com/blockchain-etl/) project on Google Bigquery as the  source for state data, such as pools' balances, fees, liquidity providers etc. The legacy scripts used up to week 25 can be found in the `js` directory.

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
| [10](/reports/10/_totals.json) |    10583488 |  10628811 |
| [11](/reports/11/_totals.json) |    10628811 |  10674230 |
| [12](/reports/12/_totals.json) |    10674230 |  10719753 |
| [13](/reports/13/_totals.json) |    10719753 |  10765333 |
| [14](/reports/14/_totals.json) |    10765333 |  10811169 |
| [15](/reports/15/_totals.json) |    10811169 |  10856779 |
| [16](/reports/16/_totals.json) |    10856779 |  10902386 |
| [17](/reports/17/_totals.json) |    10902386 |  10947679 |
| [18](/reports/18/_totals.json) |    10947679 |  10992408 |
| [19](/reports/19/_totals.json) |    10992408 |  11037419 |
| [20](/reports/20/_totals.json) |    11037419 |  11083026 |
| [21](/reports/21/_totals.json) |    11083026 |  11128711 |
| [22](/reports/22/_totals.json) |    11128711 |  11174328 |
| [23](/reports/23/_totals.json) |    11174328 |  11219938 |
| [24](/reports/24/_totals.json) |    11219938 |  11265559 |
| [25](/reports/25/_totals.json) |    11265559 |  11311151 |
| [26](/reports/26/_totals.json) |    11311151 |  11356700 |
| [27](/reports/27/_totals.json) |    11356700 |  11402291 |
| [28](/reports/28/_totals.json) |    11402291 |  11447731 |
| [29](/reports/29/_totals.json) |    11447731 |  11493367 |
| [30](/reports/30/_totals.json) |    11493367 |  11538966 |
| [31](/reports/31/_totals.json) |    11538966 |  11584641 |
| [32](/reports/32/_totals.json) |    11584641 |  11630234 |
| [33](/reports/33/_totals.json) |    11630234 |  11675866 |
| [34](/reports/34/_totals.json) |    11675866 |  11721455 |
| [35](/reports/35/_totals.json) |    11721455 |  11766939 |
| [36](/reports/36/_totals.json) |    11766939 |  11812442 |
| [37](/reports/37/_totals.json) |    11812442 |  11857946 |
| [38](/reports/38/_totals.json) |    11857946 |  11903479 |

## Requirements
* Python 3 + Jupyter Notebook
* An ethereum node (for querying blocks timestamps and token decimals) 
* A [service account key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#iam-service-account-keys-create-console) with read access to Google BigQuery

## Setup
* Install required packages: `pip install -r requirements.txt`
* Configure environment variables:
  * `ENDPOINT_URL`: URL to an ethereum node that can be queried via Websockets
  * `GOOGLE_APPLICATION_CREDENTIALS`: path to a JSON file that contains a service account key with read access to Google BigQuery

## Usage
1. Start Jupyter Notebook: `jupyter notebook`  
1. Open the `bal-mining.ipynb` notebook   
1. Run all cells
2. Plots are displayed throughout the notebook. JSON reports are stored in the `reports` directory, with a final tally of user address to BAL received stored in the report week folder at `_totals.json`

## Weekly distributions

145,000 BAL will be distributed on a weekly basis. Liquidity providers must claim their BAL at [claim.balancer.finance](https://claim.balancer.finance/).

## BAL Redirections

In case smart contracts which cannot receive BAL tokens are specified, owners of those smart contracts can choose to redirect BAL tokens to a new address. In order to submit a redirection request, submit a pull request to update `redirect.json` using `"fromAddress" : "toAddress"` along with some sort of ownership proof. Please reach out to the Balancer team if you need assistance.

## BAL Redistributions

The mining script identifies the liquidity providers of configurable rights pools (CRPs) deployed via the CRPFactory and redistributes BAL earned by those pools appropriately. CRPs deployed via other methods should submit a pull request to update `redistribute.json` using `"controllerAddress" : "poolDescription"` along with some sort of ownership proof. Please reach out to the Balancer team if you need assistance.