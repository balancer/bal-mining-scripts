from google.cloud import bigquery
from google.cloud import bigquery_storage
import matplotlib.pyplot as plt
from web3 import Web3
import pandas as pd
import time

def compute_bal_for_gas(start_block_timestamp, end_block_timestamp, gas_whitelist, plot=True, verbose=True):
    sql = ''
    with open('src/bal4gas_V1.sql','r') as file:
        sql = (file
            .read()
            .format(start_block_timestamp, 
                end_block_timestamp, 
                '\',\''.join(gas_whitelist)))
    if verbose: print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) + ' - Querying Bigquery for eligible V1 swaps and reimbursement values ...')
    client = bigquery.Client()
    bqstorageclient = bigquery_storage.BigQueryReadClient()
    reimbursements = (
        client.query(sql)
        .result()
        .to_dataframe(bqstorage_client=bqstorageclient)
    )
    if verbose: print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) + ' - Done!')
    if plot:
        reimbursements.groupby('datetime').mean()['block_median_gas_price'].plot(title='Median gas price')
        plt.show()
    
    if verbose: print(f'ETH reimbursements for the week (V1): {sum(reimbursements.eth_reimbursement)}')
    
    # get BAL:ETH price feed from Coingecko
    bal_eth_coingecko = 'https://api.coingecko.com/api/v3/coins/ethereum/contract/0xba100000625a3754423978a60c9317c58a424e3d/market_chart/range?vs_currency=eth&from={0}&to={1}'.format(start_block_timestamp-7200, end_block_timestamp+7200)

    baleth_feed = pd.read_json(bal_eth_coingecko)['prices']
    baleth_feed = pd.DataFrame(baleth_feed.tolist(), index=baleth_feed.index, columns=['timestamp','price'])
    baleth_feed['datetime'] = pd.to_datetime(baleth_feed['timestamp']/1000, unit='s', utc=True)
    if plot:
        baleth_feed.plot(x='datetime',y='price',title='BAL:ETH')
        plt.show()

    merge = pd.merge_asof(reimbursements.sort_values(by='datetime'), 
                          baleth_feed.sort_values(by='datetime'), 
                          on='datetime', direction='nearest')

    merge['bal_reimbursement'] = merge['eth_reimbursement'] / merge['price']
    if verbose: print(f'BAL reimbursements for the week (V1): {sum(merge.bal_reimbursement)}')
    merge['address'] = merge['address'].apply(Web3.toChecksumAddress)
    return merge