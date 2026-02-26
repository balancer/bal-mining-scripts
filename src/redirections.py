from urllib.request import urlopen
import json
import pandas as pd
from src.logger import LOGGER
from web3 import Web3


def get_redirects(_realtime=None):
    if _realtime:
        url = 'https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/config/redirect.json'
        jsonurl = urlopen(url)
        redirects = json.loads(jsonurl.read())
    else:
        redirects = json.load(open('config/redirect.json'))
    return redirects


def apply_redirects(_data, _realtime=None, _redirects=None):
    if _redirects:
        redirects = _redirects
    else:
        redirects = get_redirects(_realtime)
    result = pd.DataFrame(_data).reset_index()
    result['lp_address'] = result['lp_address'].apply(Web3.toChecksumAddress)
    n = len(result['lp_address'][result['lp_address'].isin(redirects.keys())])
    LOGGER.debug(f'{n} redirectors found amongst the recipients')
    result['lp_address'] = result['lp_address'].apply(
        lambda x: redirects.get(x, x))
    result = result.groupby('lp_address').sum()
    return result, n
