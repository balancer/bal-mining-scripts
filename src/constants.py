import os
NETWORKS = {
    1: 'ethereum'
}
CLAIM_PRECISIONS = { # leave out of results addresses that mined less than CLAIM_THRESHOLD
    'default': 8,
    '0xdf7837de1f2fa4631d716cf2502f8b230f1dcc32': 2
}

def get_claim_precision(_token_address=None):
    if _token_address in CLAIM_PRECISIONS.keys():
        return CLAIM_PRECISIONS[_token_address.lower()]
    return CLAIM_PRECISIONS['default']

def get_claim_threshold(_token_address=None):
    return 10**(-get_claim_precision(_token_address.lower()))

PROJECT_ID = os.environ['GCP_PROJECT']
