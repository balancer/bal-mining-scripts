from src.exclusions import get_exclusions
from src.realtime_utils import get_current_lm_week_end_timestamp, get_current_lm_week_number
from src.logger import LOGGER, logger_init
from src.query_gbq import query_gbq
from src.process_data import get_lm_allocations, get_lps_share_integral_for_pools
from src.redirections import apply_redirects
from src.export import save_report
from src.constants import *
from src.update_api_dataset import update_gbq_api_dataset
import argparse
import pandas as pd
from web3 import Web3


log_level = 'INFO'
realtime_estimator = False
this_week = get_current_lm_week_number()  # this is what week we're actually in
week_number = this_week - 1  # by default we want to run the previous week

# Argument Parsing
# week: int, number of the week to run
# rt: 1 if running real time estimator (updates the API backend)
# logs: WARNING, DEBUG, INFO
parser = argparse.ArgumentParser()
parser.add_argument(
    '--week',
    help='the week number to run the script for',
    type=int)
parser.add_argument(
    '--rt',
    help='pass 1 to run realtime estimator; ignores week parameter',
    type=int)
parser.add_argument(
    '--logs',
    help='{WARNING, DEBUG, INFO}',
    type=str)
args = parser.parse_args()

# initialize the logger
if args.logs:  # if realtime = True
    log_level = args.logs.upper()
logger_init(log_level)

if args.rt:  # if realtime = True
    LOGGER.info('Running realtime estimator')
    week_number = this_week
    realtime_estimator = True
    if args.week:
        LOGGER.warning('Running realtime estimator, ignoring week parameter')
elif args.week:
    week_number = args.week
    if week_number > this_week:
        exit(
            f'Error: week {week_number} is in the future, this is week {this_week}')
    if week_number == this_week:
        LOGGER.warning(
            f'Warning: week {week_number} is not over yet. Did you mean to run the realtime estimator?')


# for each network
LOGGER.info(f'Week: {week_number}')
full_export = pd.DataFrame()
for chain_id in NETWORKS.keys():
    LOGGER.info(f'Computing distributions for {NETWORKS[chain_id]}')
    # get LM allocations for the week on the chain
    LOGGER.info('Fetching incentives allocation')
    allocations_df, week_passed = get_lm_allocations(
        chain_id, _week_number=week_number, _realtime=realtime_estimator)
    # get a list of incentivized pools
    incentivized_pools = allocations_df.index.drop_duplicates().values
    # get LM power changes data from Google Big Query
    LOGGER.info('Querying GBQ')
    raw_data_df = query_gbq(chain_id, week_number, incentivized_pools)
    # get pools with liquidity providers that have opted-out of LM incentives
    exclusions = get_exclusions(chain_id)
    # process raw data to obtain the share of LM incentives for each LP in each pool
    share_df = get_lps_share_integral_for_pools(
        raw_data_df, _exclusions=exclusions, _realtime=realtime_estimator)
    # compute the amounts earned by each LP on each pool
    proceeds_df = allocations_df.mul(share_df['share_integral'], axis=0)
    velocity_df = allocations_df.div(
        week_passed*7*24*3600).mul(share_df['latest_share'], axis=0)
    # compute the amounts earned by each LP
    amounts_df = (
        proceeds_df
        .groupby('lp_address')
        .sum()
        .melt(var_name='token_address', value_name='earned', ignore_index=False)
        .set_index('token_address', append=True)
    )
    # compute the velocity at which each LP is earning tokens
    velocity_df = (
        velocity_df
        .groupby('lp_address')
        .sum()
        .melt(var_name='token_address', value_name='velocity', ignore_index=False)
        .set_index('token_address', append=True)
    )
    results_df = amounts_df.join(velocity_df)
    results_tokens = results_df.index.get_level_values(
        'token_address').drop_duplicates()
    # apply redirects and save reports
    for token in results_tokens:
        LOGGER.debug(f'Redirecting {token}...')
        export_data = results_df.loc[(slice(None), [token]), [
            'earned']].droplevel('token_address')
        redirects = apply_redirects(export_data)
        export_data = redirects[0]
        redirected_n = redirects[1]
        LOGGER.info(f'{token} - {redirected_n} redirectors')
        filename = save_report(week_number, chain_id,
                               token, export_data['earned'])
    if realtime_estimator:
        results_df = results_df.reset_index()
        results_df['lp_address'] = results_df['lp_address'].apply(
            Web3.toChecksumAddress)
        results_df = results_df.rename(columns={'lp_address': 'address'})
        results_df['timestamp'] = get_current_lm_week_end_timestamp()
        results_df['week'] = week_number
        results_df['earned'] = results_df['earned'].apply(
            lambda x: format(x, f'.{CLAIM_PRECISION}f'))
        results_df['velocity'] = results_df['velocity'].apply(
            lambda x: format(x, f'.{CLAIM_PRECISION}f'))
        results_df['chain_id'] = chain_id
        full_export = full_export.append(results_df)

if realtime_estimator:
    update_gbq_api_dataset(full_export, week_number)
