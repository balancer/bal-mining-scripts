import os
import json
import numpy as np
import pandas as pd
from time import sleep
from decimal import Decimal
from google.colab import files
from urllib.request import urlopen

# Contant URLs from Balancer's GitHub repositories
BASE_REPORTS_URL = (
    "https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/master/reports"
)
ORCHARD_CONFIG_URL = "https://raw.githubusercontent.com/balancer-labs/frontend-v2/master/src/services/claim/MultiTokenClaim.json"
MINING_CONFIG_URL = "https://raw.githubusercontent.com/balancer-labs/bal-mining-scripts/9e9f067e48704b476a325d9eaab945675d76c1ac/js/src/config/liquidityMiningConfig.json"

# CSV containing DistributionClaimed events emitted by each MerkleOrchard. Source: https://dune.com/queries/1920221
CLAIMS_GIST_URL = "https://gist.githubusercontent.com/mendesfabio/4a0b58fd1dd9b66df07c753b0b6d75a9/raw/d453c1b8fadef1db328ba9814598435b8d0e3b77/claims.csv"

# CSV containing DistributionAdded events emitted by each MerkleOrchard. Source: https://dune.com/queries/1922885
ORCHARD_GIST_URL = "https://gist.githubusercontent.com/mendesfabio/309f079dfcd35c2dc88d18f7cae0bca2/raw/3e6a3df2529e6bf6b04b1c9540fccd9042bafd90/orchard.csv"

# CSV containing DistributionClaimed events emitted when Balancer DAO recovered funds. Source: https://dune.com/queries/1974843
RECOVERY_GIST_URL = "https://gist.githubusercontent.com/mendesfabio/4caee5606263dbd2dd4b23b8b4b74095/raw/b899737b2b41fb9f370d2cc5017a84513be1945b/recovery.csv"

# Leave out of results addresses that mined less than CLAIM_THRESHOLD
CLAIM_PRECISIONS = {"default": 8, "0xdf7837de1f2fa4631d716cf2502f8b230f1dcc32": 2}

# Helper functions


def get_claim_precision(_token_address=None):
    """Get claim precision for a given token"""
    if _token_address in CLAIM_PRECISIONS.keys():
        return CLAIM_PRECISIONS[_token_address.lower()]
    return CLAIM_PRECISIONS["default"]


def get_claim_threshold(_token_address=None):
    """Get claim threshold for a given token"""
    return 10 ** (-get_claim_precision(_token_address.lower()))


def get_chain_from_filename(report_filename):
    """Extract chain name (3rd param) from report filename, returns "ethereum" if fails"""
    try:
        return report_filename.split("_")[2]
    except:
        return "ethereum"


def get_token_from_filename(report_filename):
    """Try to extract token address (4rd param) from report filename, returns BAL address on Ethereum if fails"""
    try:
        return report_filename.split("_")[3].split(".")[0].lower()
    except:
        return "0xba100000625a3754423978a60c9317c58a424e3d"


def get_decimal_from_value(value):
    """Return value as Decimal instance"""
    return Decimal(value)


def load_json_from_url(_url):
    """Request URL content and returns as JSON"""
    try:
        return json.loads(urlopen(_url).read())
    except:
        print("failed to load:", _url)
        return {}


def save_incident_report(_chain, _token, _data):
    """Gets DataFrame report and save as JSON"""
    print(f"saving {_token} report...")
    reports_dir = f"reports/_incident-response/1"
    if not os.path.exists(reports_dir):
        os.mkdir(reports_dir)
    filename = f"{reports_dir}/__{_chain}_{_token}.json"
    export_data = _data[_data > get_claim_threshold(_token)]
    export = export_data.apply(lambda x: format(x, f".{get_claim_precision(_token)}f"))
    export_json = export.to_json()
    parsed_export = json.loads(export_json)
    with open(filename, "w") as write_file:
        json.dump(parsed_export, write_file, indent=4)
    print(f"saved to {filename}")


# Create DataFrame with config distribution information: chain, token, decimals, offset, filename, snapshot
mining_config_dict = load_json_from_url(MINING_CONFIG_URL)
mining_config_dict.pop("kovan")
mining_config_raw = pd.DataFrame.from_dict(mining_config_dict.values())
mining_config_raw["chain"] = mining_config_raw["reportFilename"].apply(
    get_chain_from_filename
)
mining_config_raw["token"] = mining_config_raw["reportFilename"].apply(
    get_token_from_filename
)
mining_config_raw["decimals"] = mining_config_raw["decimals"].fillna(18)
mining_config_raw["snapshot"] = mining_config_raw["jsonSnapshotFilename"]
mining_config_raw["filename"] = mining_config_raw["reportFilename"]
mining_config = mining_config_raw.copy()[
    ["chain", "token", "decimals", "offset", "filename", "snapshot"]
]

# Load and transform data from all DistributionAdded events emitted before the Balancer DAO recovered the funds
distributions_added = pd.read_csv(ORCHARD_GIST_URL)
distributions_added = distributions_added.merge(
    mining_config, on=["token", "chain"], how="left"
)
distributions_added["week"] = (
    distributions_added["distribution_id"] + distributions_added["offset"]
)
distributions_added["distributed_amount_raw"] = distributions_added[
    "distributed_amount"
].astype(float)
distributions_added["distributed_amount"] = distributions_added[
    "distributed_amount_raw"
] / (10 ** distributions_added["decimals"])

# Load and transformn data from all DistributionClaimed events emitted before the Balancer DAO recovered the funds
claims = pd.read_csv(CLAIMS_GIST_URL)
weekly_claims = claims.merge(mining_config, on=["token", "chain"], how="left")
weekly_claims["claimed_amount_raw"] = weekly_claims["claimed_amount"]
weekly_claims["claimed_amount"] = weekly_claims["claimed_amount_raw"].astype(float) / (
    10 ** weekly_claims["decimals"]
)
weekly_claims["week"] = weekly_claims["distribution_id"] + weekly_claims["offset"]
weekly_claims = weekly_claims[
    [
        "week",
        "chain",
        "token",
        "distributor",
        "distribution_id",
        "claimer",
        "claimed_amount_raw",
        "claimed_amount",
    ]
]

# Load data from DistributionClaimed events emitted when Balancer DAO recovered the funds
recovered_distributions = pd.read_csv(
    RECOVERY_GIST_URL, converters={"claimed_amount": get_decimal_from_value}
)
recovered_distributions = (
    recovered_distributions.groupby(["chain", "token", "distributor"])["claimed_amount"]
    .sum()
    .reset_index()
)

# Load and transform distributions from mining reports (https://github.com/balancer-labs/bal-mining-scripts/tree/master/reports)

dfs = []

recovered_tokens = recovered_distributions["token"].to_list()
recovered_distributors = recovered_distributions["distributor"].to_list()

for idx, row in distributions_added.iterrows():
    week = row["distribution_id"] + row["offset"]

    if (
        row["token"] not in recovered_tokens
        or row["distributor"] not in recovered_distributors
    ):
        continue

    if row["distributed_amount"] == "0":
        claimer = claims[
            (claims["distributor"] == row["distributor"])
            & (claims["token"] == row["token"])
        ]["claimer"].values[0]
        df = pd.DataFrame({"distributed_amount": [0], "claimer": [claimer]})
    else:
        report_url = f"{BASE_REPORTS_URL}/{week}/{row['filename']}"
        report = load_json_from_url(report_url)

        df = pd.DataFrame(report.items(), columns=["claimer", "distributed_amount"])
        df["distributed_amount"] = df["distributed_amount"].astype(float)
        df["claimer"] = df["claimer"].str.lower()

    df["distribution_id"] = row["distribution_id"]
    df["distributor"] = row["distributor"]
    df["chain"] = row["chain"]
    df["token"] = row["token"]
    df["week"] = week

    dfs.append(df)

distributions = pd.concat(dfs)

# Calculate remaining amount by claimers

remaining_claims = distributions.merge(
    weekly_claims,
    on=["week", "chain", "token", "claimer", "distributor", "distribution_id"],
    how="left",
)
remaining_claims["claimed_amount"] = (
    remaining_claims["claimed_amount"].fillna(0).astype(float)
)
remaining_claims["remaining_amount"] = (
    remaining_claims["distributed_amount"] - remaining_claims["claimed_amount"]
)

# Create mining reports for chain/token pairs
for idx, row in recovered_distributions.iterrows():
    remaining_data = remaining_claims.query(
        f"chain == '{row['chain']}' and token == '{row['token']}'"
    )
    remaining_data = remaining_data.groupby("claimer")["remaining_amount"].sum()
    save_incident_report(row["chain"], row["token"], remaining_data)
