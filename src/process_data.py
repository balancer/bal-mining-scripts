from __future__ import unicode_literals
from src.logger import LOGGER
import time
import pandas as pd
import datetime
from urllib.request import urlopen
import json
from src.realtime_utils import get_current_lm_week_number, get_percent_week_passed

V2_LM_ALLOCATION_URL = 'https://raw.githubusercontent.com/balancer-labs/frontend-v2/master/src/lib/utils/liquidityMining/MultiTokenLiquidityMining.json'


def compute_LM_power_timeseries(_df):
    LOGGER.debug('compute_LM_power_timeseries')
    df = _df.copy()
    df['lm_power'] = df.sort_index().groupby(['lp_address']).cumsum()
    df = df.drop(columns=['delta'])
    df = df.clip(lower=0)

    lp_addresses_list = (
        df
        .index
        .get_level_values('lp_address')
        .drop_duplicates()
        .sort_values()
        .values
    )
    block_timestamps_list = (
        df
        .index
        .get_level_values('block_timestamp')
        .drop_duplicates()
        .sort_values()
        .values
    )
    levels = [lp_addresses_list, block_timestamps_list]
    new_index = pd.MultiIndex.from_product(levels,
                                           names=['lp_address',
                                                  'block_timestamp'],
                                           )
    df = df.tz_localize(None, level='block_timestamp')
    LOGGER.debug('reindexing ({})...'.format(len(block_timestamps_list)))
    df = df.reindex(index=new_index)
    df.loc(axis=0)[:, block_timestamps_list[0]] = df.loc(
        axis=0)[:, block_timestamps_list[0]].fillna(0)
    df = df.fillna(method='pad')
    LOGGER.debug('done')
    return df


def compute_timestamp_intervals(_blocks, _realtime=None):
    LOGGER.debug('compute_timestamp_intervals')
    blocks = pd.Series(_blocks).drop_duplicates().sort_values().values
    intervals = pd.Series(blocks, index=blocks).diff().shift(-1)
    if _realtime:
        intervals.iloc[-1] = datetime.datetime.utcnow() - intervals.index[-1]
    else:
        intervals.iloc[-1] = intervals.index[0] + \
            datetime.timedelta(days=7) - intervals.index[-1]
    intervals = intervals.dt.total_seconds()
    intervals.name = 'state_duration'
    intervals.index.name = 'block_timestamp'
    return intervals


def compute_total_LM_power_timeseries(_df):
    LOGGER.debug('compute_total_LM_power_timeseries')
    total_lm_power = _df.groupby('block_timestamp')['lm_power'].sum()
    total_lm_power.name = 'total_lm_power'
    return total_lm_power


def get_lps_share_integral_for_pool(_df, _realtime=None, _exclusions={}):
    LOGGER.debug('get_lps_share_integral_for_pool')
    df = compute_LM_power_timeseries(_df)

    latest_timestamp = df.index.get_level_values('block_timestamp').max()
    intervals = compute_timestamp_intervals(
        df.index.get_level_values('block_timestamp'), _realtime)
    df = df.join(intervals)

    total_lm_power = compute_total_LM_power_timeseries(df)
    df = df.join(total_lm_power)

    df['lm_share'] = df['lm_power']/df['total_lm_power']
    df['share_integral'] = df['lm_share'] * df['state_duration']

    latest_share = df.iloc[df.index.get_locs(
        [slice(None), latest_timestamp])]['lm_share']
    latest_share = latest_share.droplevel('block_timestamp')

    total_share_integral = df['share_integral'].sum()
    lp_lm_share = df.groupby('lp_address')[
        'share_integral'].sum() / total_share_integral
    result = latest_share.to_frame().join(lp_lm_share)
    result.columns = ['latest_share', 'share_integral']
    return result


def get_lps_share_integral_for_pools(_df, _realtime=None, _exclusions={}):
    LOGGER.debug('get_lps_share_integral_for_pools')
    pools_list = _df.index.get_level_values('pool_address').drop_duplicates()
    lm_shares_df = pd.DataFrame()
    for pool in pools_list:
        LOGGER.info('Computing shares of incentives for pool ' + pool)
        pool_data = _df.loc[pool]
        uneligible_lps = [address.lower()
                          for address in _exclusions.get(pool, [])]
        eligible_lps_pool_data = pool_data.query(
            f'lp_address not in {uneligible_lps}')
        if len(uneligible_lps) > 0:
            LOGGER.info(
                f'Total LPs: {len(pool_data.index.get_level_values("lp_address").drop_duplicates())}')
            LOGGER.info(f'Uneligible LPs: {uneligible_lps}')
            LOGGER.info(
                f'Eligilble LPs: {len(eligible_lps_pool_data.index.get_level_values("lp_address").drop_duplicates())}')
        lps_shares = get_lps_share_integral_for_pool(
            eligible_lps_pool_data, _realtime=_realtime, _exclusions=uneligible_lps)
        pool_df = pd.DataFrame(lps_shares)
        pool_df['pool_address'] = pool
        lm_shares_df = lm_shares_df.append(pool_df)
    lm_shares_df = lm_shares_df.reset_index().set_index(
        ['pool_address', 'lp_address'])
    return lm_shares_df

# This is a workaround to ignore reward tokens added to the JSON 
# only for the purposes of having their APR be displayed on the UI
EXCLUDED_POOLS_TOKENS = {
    '0xde8c195aa41c11a0c4787372defbbddaa31306d2000200000000000000000181':
        [
            '0x6810e776880C02933D47DB1b9fc05908e5386b96',
            '0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB'
        ],
    '0x92762b42a06dcdddc5b7362cfb01e631c4d44b40000200000000000000000182':
        [
            '0x6810e776880C02933D47DB1b9fc05908e5386b96',
            '0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB'
        ]
}

def get_lm_allocations(_chain_id, _week_number=0, _realtime=None):
    LOGGER.debug('get_lm_allocations')
    week_passed = 3/7 if _chain_id == 1 else 1
    if _realtime:
        _week_number = get_current_lm_week_number()
        week_passed = get_percent_week_passed()

    jsonurl = urlopen(V2_LM_ALLOCATION_URL)
    try:
        week_allocation = json.loads(jsonurl.read())[f'week_{_week_number}']
    except KeyError:
        week_allocation = {}
    for chain_allocation in week_allocation:
        if chain_allocation['chainId'] == _chain_id:
            df = pd.DataFrame()
            for pool, rewards in chain_allocation['pools'].items():
                for r in rewards:
                    if r['tokenAddress'] in EXCLUDED_POOLS_TOKENS.get(pool,[]):
                        continue
                    pool_address = pool[:42].lower()
                    df.loc[pool_address, r['tokenAddress']
                           ] = r['amount'] * week_passed
            if len(df) == 0:
                LOGGER.info('No incentives for this chain')
                continue
            df.fillna(0, inplace=True)
            df.index.name = 'pool_address'
            return df, week_passed
