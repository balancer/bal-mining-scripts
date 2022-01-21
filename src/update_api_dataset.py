from src.constants import PROJECT_ID
from src.logger import LOGGER
from google.cloud import bigquery
import pandas as pd


def update_gbq_api_dataset(_full_export, _week_number):
    # zero previous week's velocity
    prev_week = _week_number - 1
    LOGGER.info(f'Zeroing velocity for week {prev_week}')
    sql = f'''
        UPDATE {PROJECT_ID}.bal_mining_estimates.lp_estimates_multitoken_bkp
        SET velocity = '0'
        WHERE week = {prev_week}
    '''
    client = bigquery.Client()
    query = client.query(sql)
    query.result()
    LOGGER.info('Done')

    _full_export.reset_index(inplace=True)
    LOGGER.info('Saving estimates to staging...')
    _full_export.to_gbq('bal_mining_estimates.lp_estimates_multitoken_staging',
                        project_id=PROJECT_ID,
                        if_exists='replace')
    LOGGER.info('Done')

    # merge staging into prod
    sql = '''
    MERGE bal_mining_estimates.lp_estimates_multitoken_bkp prod
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
