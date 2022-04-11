from src.logger import LOGGER
import time
from google.cloud import bigquery
from google.cloud import bigquery_storage
import pandas as pd

SQL_FILE_PATH = 'src/base_sql.sql'
TABLES_CONFIGS = {
    1: {
        'blocks': 'bigquery-public-data.crypto_ethereum.blocks',
        'lm_transfers': 'blockchain-etl.ethereum_balancer.view_LM_transfers',
        'lm_state': 'blockchain-etl.ethereum_balancer.view_LM_state',
    },
    137: {
        'blocks': 'public-data-finance.crypto_polygon.blocks',
        'lm_transfers': 'blockchain-etl.polygon_balancer.view_LM_transfers',
        'lm_state': 'blockchain-etl.polygon_balancer.view_LM_state',
    },
    42161: {
        'blocks': 'nansen-datasets-prod.crypto_arbitrum.blocks',
        'lm_transfers': 'blockchain-etl.arbitrum_balancer.view_LM_transfers',
        'lm_state': 'blockchain-etl.arbitrum_balancer.view_LM_state',
    },
}

BASE_LP_EXCLUSION_LIST = [
    '0x0000000000000000000000000000000000000000',
    '0xba12222222228d8ba445958a75a0704d566bf2c8'
]


def query_gbq(_network, _week_number, _pool_list, _excluded_lps_list=[]):
    LOGGER.debug('query_gbq')

    _excluded_lps_list = list(set(_excluded_lps_list + BASE_LP_EXCLUSION_LIST))

    with open(SQL_FILE_PATH, 'r') as file:
        sql = file.read()

    _days_in_week = '3' if _network == 1 else '7'

    sql = sql.format(
        week_number=_week_number,
        pool_addresses="','".join(_pool_list),
        blocks_table=TABLES_CONFIGS[_network]['blocks'],
        lm_transfers_table=TABLES_CONFIGS[_network]['lm_transfers'],
        lm_state_table=TABLES_CONFIGS[_network]['lm_state'],
        excluded_lps="','".join(_excluded_lps_list),
        days_in_week=_days_in_week
    )
    client = bigquery.Client()
    bqstorageclient = bigquery_storage.BigQueryReadClient()
    df = (
        client.query(sql)
        .result()
        .to_dataframe(bqstorage_client=bqstorageclient)
    )
    df = df.groupby(['pool_address', 'lp_address', 'block_timestamp']).sum()
    return df
