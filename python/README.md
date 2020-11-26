# BAL Mining
Python implementation of the BAL liquidity mining distribution, using Google BigQuery as the data source for state: pools' balances, fees, liquidity providers etc.

## Requirements
* Python 3 + Jupyter Notebook
* An ethereum node (for querying blocks timestamps and token decimals) 
* A [service account key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#iam-service-account-keys-create-console) with read access to Google BigQuery

## Setup
`pip install -r requirements.txt`
### Environment variables
* `ENDPOINT_URL`: URL to the ethereum node (Websockets)
* `GOOGLE_APPLICATION_CREDENTIALS`: path to a JSON file that contains a service account key with read access to Google BigQuery

## Usage
1. Start Jupyter Notebook: `jupyter notebook`  
1. Open the `bal-mining.ipynb` notebook   
1. Run all cells
1. Plots are displayed throughout the notebook. JSON reports are stored in the `reports` directory
