from urllib.request import urlopen
import json
import pandas as pd
from src.logger import LOGGER
from web3 import Web3


def get_exclusions(_chain_id, _realtime=None):
    if _realtime:
        url = 'https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/config/exclude.json'
        jsonurl = urlopen(url)
        exclusions = json.loads(jsonurl.read())
    else:
        exclusions = json.load(open('config/exclude.json'))
    return exclusions.get(str(_chain_id), {})


def apply_exclusions(_data, _exclusions):
    exclusions = _data.index.isin(_exclusions)
    result = _data[~exclusions].copy()
    return result
