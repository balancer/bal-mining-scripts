from google.cloud import bigquery
import os
import pandas as pd
from datetime import datetime, timezone
from src.bal4gas import compute_bal_for_gas
import sys

project_id = os.environ['GCP_PROJECT']
start_timestamp = 1615161581 # BLOCK 11994473, which was not included in week 40
end_timestamp = int(datetime.utcnow().replace(tzinfo=timezone.utc).timestamp())

offset = 0
if len(sys.argv) > 1:
    offset = sys.argv[1]

try:
    sql = f'''
    DECLARE CUR_WEEK_START TIMESTAMP;
    DECLARE WEEK_START TIMESTAMP;

    SET CUR_WEEK_START = TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), WEEK(MONDAY));
    SET WEEK_START = TIMESTAMP_SUB(CUR_WEEK_START, INTERVAL {offset*7} DAY);

    WITH t0 as (
    SELECT UNIX_SECONDS(MIN(timestamp)) AS timestamp 
    FROM `bigquery-public-data.crypto_ethereum.blocks`
    WHERE timestamp >= WEEK_START
    AND timestamp <= TIMESTAMP_ADD(WEEK_START, interval 1 HOUR)
    ),
    t1 as (
    SELECT UNIX_SECONDS(MAX(timestamp)) as timestamp 
    FROM `bigquery-public-data.crypto_ethereum.blocks`
    WHERE timestamp >= WEEK_START
    AND timestamp < TIMESTAMP_ADD(WEEK_START, interval 7 DAY)
    )
    SELECT 
    t0.timestamp as t0, 
    t1.timestamp as t1 
    FROM t0 INNER JOIN t1 ON 1=1
    '''
    results = bigquery.Client().query(sql).result()
    for row in results:
        start_timestamp = row.t0
        end_timestamp = row.t1
except:
    raise
    pass

week_1_start = '01/06/2020 00:00:00 UTC'
week_1_start = datetime.strptime(week_1_start, '%d/%m/%Y %H:%M:%S %Z')
WEEK = int(1 + (datetime.utcfromtimestamp(start_timestamp) - week_1_start).days/7)

tag = 'master'
if offset>0:
    tag = F'w{WEEK}'
whitelist = pd.read_json(f'https://raw.githubusercontent.com/balancer-labs/assets/{tag}/lists/eligible.json').index.values
gas_whitelist = pd.Series(whitelist).str.lower().tolist()

bal4gas_df = compute_bal_for_gas(start_timestamp, end_timestamp, gas_whitelist, plot=False, verbose=True)
bal4gas_df.to_gbq('bal_mining_estimates.gas_estimates_staging', 
                        project_id=project_id, 
                        if_exists='replace')

# merge staging into prod
sql = '''
MERGE bal_mining_estimates.gas_estimates prod
USING bal_mining_estimates.gas_estimates_staging stage
ON prod.transaction_hash = stage.transaction_hash
WHEN MATCHED THEN
    UPDATE SET 
        datetime = stage.datetime,
        address = stage.address,
        n_swaps = stage.n_swaps,
        block_median_gas_price = stage.block_median_gas_price,
        eth_reimbursement = stage.eth_reimbursement,
        timestamp = stage.timestamp,
        price = stage.price,
        bal_reimbursement = stage.bal_reimbursement
WHEN NOT MATCHED BY TARGET THEN
    INSERT (datetime, transaction_hash, address, n_swaps, 
            block_median_gas_price, eth_reimbursement, timestamp,
            price, bal_reimbursement)
    VALUES (datetime, transaction_hash, address, n_swaps, 
            block_median_gas_price, eth_reimbursement, timestamp,
            price, bal_reimbursement)
'''
client = bigquery.Client()
query = client.query(sql)
query.result()