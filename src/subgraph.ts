import fetch from 'isomorphic-fetch';
const SUBGRAPH_URL =
    process.env.SUBGRAPH_URL ||
    'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer';

interface User {
    id: string;
}

interface Share {
    userAddress: User;
}

interface PoolResult {
    shareHolders?: any[];
    shares: Share[];
    id?: string;
}

export const fetchAllPools = async function (block) {
    let poolResults: PoolResult[] = [];
    let skip: number = 0;
    let paginatePools: boolean = true;
    while (paginatePools) {
        let query = `
            {
                pools (first: 1000, skip: ${skip}, block: { number: ${block} }) {
                    id
                    publicSwap
                    swapFee
                    controller
                    createTime
                    tokensList
                    totalShares
                    shares (first: 1000) {
                        userAddress {
                            id
                        }
                    }
                }
            }
        `;

        let response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
            }),
        });

        let { data } = await response.json();

        poolResults = poolResults.concat(data.pools);

        if (data.pools.length < 1000) {
            paginatePools = false;
        } else {
            skip += 1000;
            continue;
        }
    }

    let finalResults: PoolResult[] = [];

    for (let pool of poolResults) {
        pool.shareHolders = pool.shares.map((a) => a.userAddress.id);
        if (pool.shareHolders.length == 1000) {
            let paginateShares = true;
            let shareSkip = 0;
            let shareResults = [];

            while (paginateShares) {
                let query = `
                    {
                        pools (where: { id: "${pool.id}"}, block: { number: ${block} }) {
                            shares (first: 1000, skip: ${shareSkip}) {
                                userAddress {
                                    id
                                }
                            }
                        }
                    }
                `;

                let response = await fetch(SUBGRAPH_URL, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query,
                    }),
                });

                let { data } = await response.json();

                let newShareHolders = data.pools[0].shares.map(
                    (a) => a.userAddress.id
                );

                shareResults = shareResults.concat(newShareHolders);

                if (newShareHolders.length < 1000) {
                    paginateShares = false;
                } else {
                    shareSkip += 1000;
                    continue;
                }
            }

            pool.shareHolders = shareResults;
            delete pool.shares;

            finalResults.push(pool);
        } else {
            delete pool.shares;
            finalResults.push(pool);
        }
    }

    return finalResults;
};
