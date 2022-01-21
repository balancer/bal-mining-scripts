import os
NETWORKS = {
    1: 'ethereum',
    137: 'polygon',
    42161: 'arbitrum'
}
CLAIM_PRECISION = 8  # leave out of results addresses that mined less than CLAIM_THRESHOLD
CLAIM_THRESHOLD = 10**(-CLAIM_PRECISION)
PROJECT_ID = os.environ['GCP_PROJECT']
