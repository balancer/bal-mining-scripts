import os
from google.cloud import bigquery
from urllib.request import urlopen
import json
from web3 import Web3

def load_json_from_url(_url):
    return json.loads(urlopen(_url).read())

def load_json_from_path(_path):
    return json.load(open(_path))

ORCHARDS_ADDRESSES = {
    1: '0xdAE7e32ADc5d490a43cCba1f0c736033F2b4eFca',
    137: '0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e',
    42161: '0x751A0bC0e3f75b38e01Cf25bFCE7fF36DE1C87DE'
}
ORCHARD_CONFIGS_URL = 'https://raw.githubusercontent.com/balancer-labs/frontend-v2/master/src/services/claim/MultiTokenClaim.json'
ORCHARD_CONFIGS = load_json_from_url(ORCHARD_CONFIGS_URL)

ORCHARD_ABI_PATH = 'abi/MerkleOrchard.json'
ORCHARD_ABI = load_json_from_path(ORCHARD_ABI_PATH)

MINING_CONFIGS_PATH = 'js/src/config/liquidityMiningConfig.json'
MINING_CONFIGS = load_json_from_path(MINING_CONFIGS_PATH)

WEB3_PROVIDERS = {
    1: Web3(Web3.WebsocketProvider(os.environ['ENDPOINT_URL'])),
    137: Web3(Web3.WebsocketProvider(os.environ['ENDPOINT_URL'].replace('mainnet','polygon-mainnet'))),
    42161: Web3(Web3.WebsocketProvider(os.environ['ENDPOINT_URL'].replace('mainnet','arbitrum-mainnet')))
}

def get_token_configs(_network, _token_address, _distribution_id):
    _network = str(_network)
    network_config = ORCHARD_CONFIGS[_network]
    result = []
    for token_config in network_config:
        if (token_config['token'].lower() == _token_address.lower()):
            result.append(token_config)
    if result:
        return result
    raise Exception('Token not found')

def get_tokens_in_orchard(_network):
    result = []
    _network = str(_network)
    network_config = ORCHARD_CONFIGS[_network]
    for token_config in network_config:
        result.append(token_config['token'].lower())
    return result

def get_past_weeks_estimates_from_gbq():
    project_id = os.environ['GCP_PROJECT']
    sql = f'''
        SELECT DISTINCT week, token_address, chain_id FROM {project_id}.bal_mining_estimates.lp_estimates_multitoken
        WHERE week < (SELECT MAX(week) FROM {project_id}.bal_mining_estimates.lp_estimates_multitoken)
    '''
    client = bigquery.Client()
    estimates = (
        client.query(sql)
        .result()
    )
    records = [dict(row) for row in estimates]
    return records

def has_distribution_been_created(_network_id, _distributor, _token_address, _distribution_id):
    orchard_address = ORCHARDS_ADDRESSES[_network_id]
    orchard_contract = WEB3_PROVIDERS[_network_id].eth.contract(orchard_address, abi=ORCHARD_ABI)
    distributionRoot = (
        orchard_contract
        .functions
        .getDistributionRoot(
            Web3.toChecksumAddress(_token_address),
            Web3.toChecksumAddress(_distributor),
            _distribution_id
        )
        .call()
    )
    try:
        return int(distributionRoot.hex()) != 0
    except:
        return True

def delete_from_gbq(_network_id, _token_address, _week):
    project_id = os.environ['GCP_PROJECT']
    sql = f'''
        DELETE FROM {project_id}.bal_mining_estimates.lp_estimates_multitoken
        WHERE week = {_week}
        AND chain_id = {_network_id}
        AND token_address = '{_token_address}'
    '''
    client = bigquery.Client()
    query = client.query(sql)
    query.result()

def week_to_distribution_id(_week, _token_address):
    if _token_address.lower() == '0xba100000625a3754423978a60c9317c58a424e3d':
        _token_address = '_totals.json'
    for config in MINING_CONFIGS.values():
        if _token_address.lower() in config['reportFilename'].lower():
            return _week - config['offset']
    raise Exception('Token not found')

EXISTING_ESTIMATES = get_past_weeks_estimates_from_gbq()
for estimate in EXISTING_ESTIMATES:
    delete_estimate = False
    network_id = estimate['chain_id']
    token_address = estimate['token_address']
    week = int(estimate['week'])
    print(f'\nFound estimate for {network_id}, {token_address}, {week}')
    if token_address.lower() in get_tokens_in_orchard(network_id):
        print(f'Token is distributed via MerkleOrchard')
        distribution_id = week_to_distribution_id(week, token_address)
        print(f'Week {week} = id {distribution_id}')
        token_configs = get_token_configs(network_id, token_address, distribution_id)
        for token_config in token_configs:
            distributor = token_config['distributor']
            print(f'Distributor:  {distributor}')
            offset = token_config['weekStart']
            if offset > distribution_id:
                print(f'Distribution via the MerkleOrchard started on id {offset}')
                delete_estimate = True
            else:
                distribution_created = (
                    has_distribution_been_created(
                        network_id,
                        distributor,
                        token_address,
                        distribution_id
                    )
                )
                if distribution_created:
                    print(f'Distribution for this token/week has been created in the MerkleOrchard')
                    delete_estimate = True
                else:
                    print(f'Distribution for this token/week not found in the MerkleOrchard')
            if delete_estimate:
                try:
                    print(f'Deleting estimate')
                    delete_from_gbq(
                        network_id,
                        token_address,
                        week
                    )
                    print(f'Estimates for chain {network_id}, week {week}, {token_address} deleted')
                except Exception as e:
                    print(f'Exception deleting chain {network_id}, week {week}, {token_address} estimates')
                    print(str(e))
            else:
                print(f'Keeping estimate')
    else:
        print(f'Token is not distributed via MerkleOrchard')
        MAINNET_BAL_MANIFEST_URL = 'https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/reports/_current.json'
        MAINNET_BAL_MANIFEST = load_json_from_url(MAINNET_BAL_MANIFEST_URL)
        if str(week-20) in MAINNET_BAL_MANIFEST.keys():
            print(f'Liquidity mining results for this week found in the mining repo')
            print(f'Deleting estimate')
            try:
                delete_from_gbq(
                    network_id,
                    token_address,
                    week
                )
                print(f'Estimates for chain {network_id}, week {week}, {token_address} deleted')
            except Exception as e:
                print(f'Exception deleting chain {network_id}, week {week}, {token_address} estimates')
                print(str(e))
        else:
            print(f'Liquidity mining results for this week not found in the mining repo yet')
            print(f'Keeping estimate')