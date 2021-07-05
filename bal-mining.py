#!/usr/bin/env python
# coding: utf-8

# In[1]:


REALTIME_ESTIMATOR = True
# set the window of blocks, will be overwritten if REALTIME_ESTIMATOR == True
week_1_start_ts = 1590969600
WEEK = 57
week_end_timestamp = week_1_start_ts + WEEK * 7 * 24 * 60 * 60
week_start_timestamp = week_end_timestamp - 7 * 24 * 60 * 60
BAL_addresses = {
    1: '0xba100000625a3754423978a60c9317c58a424e3d',
    137: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3'
}
networks = {
    1: 'ethereum',
    137: 'polygon'
}
CLAIM_PRECISION = 18 # leave out of results addresses that mined less than CLAIM_THRESHOLD
CLAIM_THRESHOLD = 10**(-CLAIM_PRECISION)
reports_dir = f'reports/{WEEK}'
def get_export_filename(network, token):
    return f'{reports_dir}/__{network}_{token}.json'


# In[2]:


from google.cloud import bigquery
from google.cloud import bigquery_storage
import warnings
import requests
import time
from web3 import Web3
import pandas as pd
from urllib.request import urlopen
import json
import os


# In[3]:


if REALTIME_ESTIMATOR:
    warnings.warn('Running realtime estimator')
    
    from urllib.request import urlopen
    import json
    url = 'https://ipfs.fleek.co/ipns/balancer-team-bucket.storage.fleek.co/balancer-claim/snapshot'
    jsonurl = urlopen(url)
    claims = json.loads(jsonurl.read())
    claimable_weeks = [20+int(w) for w in claims.keys()]
    most_recent_week = max(claimable_weeks)
    # delete the estimates for the most recent published week, since now there's an official value available on IPFS
    project_id = os.environ['GCP_PROJECT']
    sql = f'''
        DELETE FROM {project_id}.bal_mining_estimates.lp_estimates_multitoken
        WHERE week = {most_recent_week}
    '''
    client = bigquery.Client()
    query = client.query(sql)
    query.result()
    
    
    from datetime import datetime
    week_1_start = '01/06/2020 00:00:00 UTC'
    week_1_start = datetime.strptime(week_1_start, '%d/%m/%Y %H:%M:%S %Z')
    WEEK = int(1 + (datetime.utcnow() - week_1_start).days/7)  # this is what week we're actually in
    week_end_timestamp = week_1_start_ts + WEEK * 7 * 24 * 60 * 60
    week_start_timestamp = week_end_timestamp - 7 * 24 * 60 * 60
    week_end_timestamp = int(datetime.utcnow().timestamp())
    week_passed = (week_end_timestamp - week_start_timestamp)/(7*24*3600)


# In[4]:


# get addresses that redirect
if REALTIME_ESTIMATOR:
    url = 'https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/config/redirect.json'
    jsonurl = urlopen(url)
    redirects = json.loads(jsonurl.read())
else:
    redirects = json.load(open('config/redirect.json'))


# In[5]:


def get_bpt_supply_gbq(pools_addresses,
                   network):

    network_blocks_table = {
        1: 'bigquery-public-data.crypto_ethereum.blocks',
        137: 'public-data-finance.crypto_polygon.blocks',
    }

    bpt_balances_table = {
        1: 'blockchain-etl.ethereum_balancer.view_token_balances_subset',
        137: 'blockchain-etl.polygon_balancer.view_bpt_balances',
    }

    sql = '''
        DECLARE pool_addresses ARRAY<STRING>;
        SET pool_addresses = [
            '{0}'
        ];

        SELECT block_number, token_address, SUM(balance) AS supply
        FROM `{1}`
        WHERE token_address IN UNNEST(pool_addresses)
        AND address <> '0x0000000000000000000000000000000000000000'
        AND balance > 0
        AND block_number = (SELECT MAX(number) FROM `{2}`)
        GROUP BY block_number, token_address
    '''.format(
        '\',\''.join(pools_addresses),
        bpt_balances_table[network],
        network_blocks_table[network]
    )
#     print(sql)
    
    client = bigquery.Client()
    bqstorageclient = bigquery_storage.BigQueryReadClient()
    BPT_supply_df = (
        client.query(sql)
        .result()
        .to_dataframe(bqstorage_client=bqstorageclient)
    )
    return BPT_supply_df


# In[6]:


def get_bpt_supply_subgraph(pools_addresses,
                            network):

    endpoint = {
        1: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-v2',
        137: 'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2',
    }

    query = '''
        {
          pools(
            where:{address_in:
              ["{}"]
            }
          ) {
            address
            totalShares
          }
        }
    '''.replace('{','{{').replace('}','}}').replace('{{}}','{}').format(
        '","'.join(pools_addresses)
    )
    r = requests.post(endpoint[network], json = {'query':query})
    p = json.loads(r.content)['data']['pools']
    BPT_supply_df = pd.DataFrame(p)
    BPT_supply_df['totalShares'] = BPT_supply_df['totalShares'].astype(float)
    return BPT_supply_df


# In[7]:


def v2_liquidity_mining(week, 
                        pools_addresses_and_tokens_earned,
                        network):
    
    network_name = networks[network]

    network_blocks_table = {
        1: 'bigquery-public-data.crypto_ethereum.blocks',
        137: 'public-data-finance.crypto_polygon.blocks',
    }

    bpt_balances_table = {
        1: 'blockchain-etl.ethereum_balancer.view_token_balances_subset',
        137: 'blockchain-etl.polygon_balancer.view_bpt_balances',
    }

    with open('src/liquidity_mining_V2.sql','r') as file:
        sql = (
            file
            .read()
            .format(
                week, 
                '\',\''.join(pools_addresses_and_tokens_earned.index),
                network_blocks_table[network],
                bpt_balances_table[network]
            )
        )

    print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) + ' - Querying Bigquery for the V2 LPs...')

    client = bigquery.Client()
    bqstorageclient = bigquery_storage.BigQueryReadClient()
    BPT_share_df = (
        client.query(sql)
        .result()
        .to_dataframe(bqstorage_client=bqstorageclient)
    )
    print(time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()) + ' - Done!')
    BPT_share_df['miner'] = BPT_share_df['miner'].apply(Web3.toChecksumAddress)
    BPT_share_df.set_index(['pool_address','miner'], inplace=True)

    bal_mined_v2 = pools_addresses_and_tokens_earned.mul(BPT_share_df['tw_share'], axis=0)

    if REALTIME_ESTIMATOR:
        bal_mined_v2 *= week_passed

    miner_export = bal_mined_v2.groupby('miner').sum()

    for token in miner_export.columns:
        miner_export_v2 = miner_export[token].dropna()
        print(f'\n{miner_export_v2.sum()} {token} mined on {network_name}')

        v2_miners = pd.DataFrame(miner_export_v2).reset_index()
        n = len(v2_miners['miner'][v2_miners['miner'].isin(redirects.keys())])
        print(f'Redirect: {n} redirectors found')
        v2_miners['miner'] = v2_miners['miner'].apply(lambda x: redirects.get(x,x))
        miner_export_v2 = v2_miners.groupby('miner').sum()[token]

        if not REALTIME_ESTIMATOR:
            filename = get_export_filename(network_name, token)
            (
                miner_export_v2[miner_export_v2>=CLAIM_THRESHOLD]
                .apply(
                    lambda x: format(
                        x, 
                        f'.{CLAIM_PRECISION}f'
                    )
                )
                .to_json(filename, indent=4)
            )
    return miner_export


# In[8]:


# V2 allocation
V2_LM_ALLOCATION_URL = 'https://raw.githubusercontent.com/balancer-labs/frontend-v2/master/src/lib/utils/liquidityMining/MultiTokenLiquidityMining.json'
jsonurl = urlopen(V2_LM_ALLOCATION_URL)
try:
    V2_ALLOCATION_THIS_WEEK = json.loads(jsonurl.read())[f'week_{WEEK}']
except KeyError:
    V2_ALLOCATION_THIS_WEEK = {}
full_export = pd.DataFrame()
for chain in V2_ALLOCATION_THIS_WEEK:
    print('------------------------------------------------------------------------------')
    print('\nChain: {}'.format(chain['chainId']))
    df = pd.DataFrame()
    for pool,rewards in chain['pools'].items():
        for r in rewards:
            pool_address = pool[:42].lower()
            df.loc[pool_address,r['tokenAddress']] = r['amount']
    df.fillna(0, inplace=True)
    df.index.name = 'pool_address'
    print('BAL to be mined on this chain: {}'.format(df[BAL_addresses[chain['chainId']]].sum()))

    if not REALTIME_ESTIMATOR:
        print('Google BigQuery sanity check - BPT supply:')
        supply_gbq = get_bpt_supply_gbq(df.index, chain['chainId'])
        supply_gbq.set_index('token_address', inplace=True)
        supply_gbq.index.name = 'pool_address'
        supply_subgraph = get_bpt_supply_subgraph(df.index, chain['chainId'])
        supply_subgraph.set_index('address', inplace=True)
        supply_subgraph.index.name = 'pool_address'
        all_good = True
        for i,r in supply_subgraph.join(supply_gbq).iterrows():
            error = (r.supply/1e18 / r.totalShares)
            if abs(error-1) > 1e-3:
                all_good = False
                print(f'{i} : {error:.3f}')
        if all_good:
            print('   All good')
        else:
            print('other than that, all good')    
            
    chain_export = v2_liquidity_mining(WEEK, df, chain['chainId'])
    chain_export['chain_id'] = chain['chainId']
    full_export = full_export.append(chain_export)


# In[9]:


if not REALTIME_ESTIMATOR:
    mainnet_BAL = pd.read_json(
        get_export_filename(networks[1], BAL_addresses[1]), 
        typ='series', 
        convert_dates=False)

    polygon_BAL = pd.read_json(
        get_export_filename(networks[137], BAL_addresses[137]), 
        typ='series', 
        convert_dates=False)

    mined_BAL = mainnet_BAL.add(polygon_BAL, fill_value=0)

    filename = '/_totalsLiquidityMining.json'
    (
        mined_BAL[mined_BAL>=CLAIM_THRESHOLD]
        .apply(
            lambda x: format(
                x, 
                f'.{CLAIM_PRECISION}f'
            )
        )
        .to_json(reports_dir+filename, indent=4)
    )
    print('Total BAL mined: {}'.format(mined_BAL.sum()))


# In[10]:


full_export_bkp = full_export.copy()


# In[11]:


full_export = (
    full_export_bkp
    .set_index('chain_id', append=True)
    .melt(
        var_name = 'token_address', 
        value_name = 'earned',
        ignore_index=False)
    .reset_index()
)
full_export.rename(columns={'miner':'address'}, inplace=True)
full_export.set_index(['address','chain_id','token_address'], inplace=True)
full_export.dropna(inplace=True)
full_export['earned'] = full_export['earned'].apply(lambda x: format(x, f'.{18}f'))


# # Update real time estimates in GBQ

# In[12]:


if REALTIME_ESTIMATOR:
    try:
        sql = f'select * from bal_mining_estimates.lp_estimates_multitoken WHERE week = {WEEK}'
        prev_estimate = pd.read_gbq(sql, 
                        project_id=os.environ['GCP_PROJECT'])
        prev_estimate.set_index(['address','chain_id','token_address'], inplace=True)
        prev_estimate_timestamp = prev_estimate.iloc[0]['timestamp']
    except:
        prev_estimate_timestamp = 0
    if prev_estimate_timestamp < week_start_timestamp:
        #previous estimate is last week's; compute velocity between from week_start_timestamp and week_end_timestamp
        delta_t = (week_end_timestamp - week_start_timestamp)
        earned = full_export['earned'].astype(float)
        full_export['velocity'] = (earned/delta_t).apply(lambda x: format(x, f'.{18}f'))
    else:
        #compute velocity based on increase and time passed
        delta_t = (week_end_timestamp - prev_estimate_timestamp)
        diff_estimate = full_export.join(prev_estimate, rsuffix='_prev').fillna(0)
        cur_earned = diff_estimate['earned'].astype(float)
        prev_earned = diff_estimate['earned_prev'].astype(float)
        full_export['velocity'] = ((cur_earned-prev_earned)/delta_t).apply(lambda x: format(x, f'.{18}f'))

    full_export['timestamp'] = week_end_timestamp
    full_export['week'] = WEEK
    full_export.reset_index(inplace=True)
#     full_export.dropna(inplace=True)
#     full_export.to_gbq('bal_mining_estimates.lp_estimates_multitoken', 
#                        project_id=os.environ['GCP_PROJECT'], 
#                        if_exists='replace')
    full_export.to_gbq('bal_mining_estimates.lp_estimates_multitoken_staging', 
                       project_id=os.environ['GCP_PROJECT'], 
                       if_exists='replace')

    # merge staging into prod
    sql = '''
    MERGE bal_mining_estimates.lp_estimates_multitoken prod
    USING bal_mining_estimates.lp_estimates_multitoken_staging stage
    ON prod.address = stage.address
    AND prod.week = stage.week
    AND prod.chain_id = stage.chain_id
    AND prod.token_address = stage.token_address
    WHEN MATCHED THEN
        UPDATE SET 
            earned = stage.earned,
            velocity = stage.velocity,
            timestamp = stage.timestamp
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (address, week, chain_id, token_address, earned, velocity, timestamp)
        VALUES (address, week, chain_id, token_address, earned, velocity, timestamp)
    '''
    client = bigquery.Client()
    query = client.query(sql)
    query.result()


# # Gas Reimbursement Program

# In[13]:


from src.bal4gas_V1 import compute_bal_for_gas as compute_bal_for_gas_V1
from src.bal4gas_V2 import compute_bal_for_gas as compute_bal_for_gas_V2

if not REALTIME_ESTIMATOR:
    whitelist = pd.read_json(f'https://raw.githubusercontent.com/balancer-labs/assets/w{WEEK-1}/lists/eligible.json').index.values
    gas_whitelist = pd.Series(whitelist).str.lower().tolist()
    gas_whitelist.append('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')

    
    v1 = compute_bal_for_gas_V1(week_start_timestamp, week_end_timestamp, gas_whitelist, plot=True, verbose=True)

    gas_whitelist.remove('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    gas_whitelist.append('0x0000000000000000000000000000000000000000')
    v2 = compute_bal_for_gas_V2(week_start_timestamp, week_end_timestamp, gas_whitelist, plot=True, verbose=True)
    
    merge = v1.append(v2)

    totals_bal4gas = merge[['address','bal_reimbursement']].groupby('address').sum()['bal_reimbursement']
    totals_bal4gas[totals_bal4gas>=CLAIM_THRESHOLD].apply(       lambda x: format(x, f'.{CLAIM_PRECISION}f')).to_json(reports_dir+'/_gasReimbursement.json',
       indent=4)

    # combine BAL from liquidity mining and gas reimbursements
    totals = mainnet_BAL.add(totals_bal4gas, fill_value=0)
    totals[totals>=CLAIM_THRESHOLD].apply(       lambda x: format(x, f'.{CLAIM_PRECISION}f')).to_json(reports_dir+'/_totals.json',
       indent=4)


# In[14]:


if not REALTIME_ESTIMATOR:
    print('Final Check Totals BAL')
    
    
    _ethereum = pd.read_json(
        get_export_filename(networks[1], BAL_addresses[1]), 
        typ='series', 
        convert_dates=False).sum()

    _polygon = pd.read_json(
        get_export_filename(networks[137], BAL_addresses[137]), 
        typ='series', 
        convert_dates=False).sum()
    
    
    _lm_both = pd.read_json(reports_dir+'/_totalsLiquidityMining.json', orient='index').sum().values[0]
    _claim = pd.read_json(reports_dir+'/_totals.json', orient='index').sum().values[0]
    print(f'Liquidity Mining Ethereum: {format(_ethereum, f".{CLAIM_PRECISION}f")}')
    print(f'Liquidity Mining Polygon: {format(_polygon, f".{CLAIM_PRECISION}f")}')
    print(f'Liquidity Mining Both: {format(_lm_both, f".{CLAIM_PRECISION}f")}')
    print(f'Gas Reimbursement week {WEEK}: {format(_claim-_ethereum, f".{CLAIM_PRECISION}f")}')
    print(f'Claims: {format(_claim, f".{CLAIM_PRECISION}f")}')

