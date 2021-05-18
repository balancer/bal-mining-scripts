WITH trades AS (
    SELECT 
    transaction_hash,
    SPLIT(singleSwap)[OFFSET(2)] AS tokenIn,
    SPLIT(singleSwap)[OFFSET(3)] AS tokenOut 
    FROM `blockchain-etl.ethereum_balancer.V2_Vault_call_swap`
    WHERE to_address = '0xba12222222228d8ba445958a75a0704d566bf2c8'
    AND block_timestamp >= TIMESTAMP_SECONDS({0})
    AND block_timestamp < TIMESTAMP_SECONDS({1})

    UNION ALL
    
    SELECT 
      transaction_hash,
      CASE 
        WHEN kind = '0' THEN
          SPLIT(assets)[OFFSET(
            CAST(
              SPLIT(swaps)[OFFSET(1)] AS INT64
            )
          )] 
        ELSE
          SPLIT(assets)[OFFSET(
            CAST(
              SPLIT(swaps)[ORDINAL(ARRAY_LENGTH(SPLIT(swaps))-3)] AS INT64
            )
          )]     
      END AS tokenIn, 
      CASE 
        WHEN kind = '0' THEN
          SPLIT(assets)[OFFSET(
            CAST(
              SPLIT(swaps)[ORDINAL(ARRAY_LENGTH(SPLIT(swaps))-2)] AS INT64
            )
          )]
        ELSE
          SPLIT(assets)[OFFSET(
            CAST(
              SPLIT(swaps)[OFFSET(2)] AS INT64
            )
          )] 
      END AS tokenOut, 
    FROM `blockchain-etl.ethereum_balancer.V2_Vault_call_batchSwap`
    WHERE to_address = '0xba12222222228d8ba445958a75a0704d566bf2c8'
    AND ARRAY_LENGTH(SPLIT(swaps)) > 4
    AND status=1
    AND block_timestamp >= TIMESTAMP_SECONDS({0})
    AND block_timestamp < TIMESTAMP_SECONDS({1})
),
trades_swaps AS (
    SELECT t.*, s.tokenIn as swap_tokenIn, s.tokenOut as swap_tokenOut
    FROM `blockchain-etl.ethereum_balancer.V2_Vault_event_Swap` s
    INNER JOIN trades t
    ON t.transaction_hash = s.transaction_hash
    AND s.block_timestamp >= TIMESTAMP_SECONDS({0})
    AND s.block_timestamp < TIMESTAMP_SECONDS({1})
),
eligibility AS (
    SELECT *, 
    CASE 
    WHEN LOWER(tokenIn)   IN ('{2}') 
        AND LOWER(tokenOut) IN ('{2}') 
    THEN 1
    WHEN LOWER(swap_tokenIn)   IN ('{2}') 
        AND LOWER(swap_tokenOut) IN ('{2}') 
    THEN 1
    ELSE 0 END as eligible_swaps
    FROM trades_swaps
), n_swaps AS (
    SELECT 
        transaction_hash, 
        txns.from_address, 
        txns.block_number, 
        txns.block_timestamp, 
        SUM(eligible_swaps) as n_swaps 
    FROM eligibility e
    INNER JOIN `bigquery-public-data.crypto_ethereum.transactions` txns
    ON txns.`hash` = e.transaction_hash
    AND txns.block_timestamp >= TIMESTAMP_SECONDS({0})
    AND txns.block_timestamp < TIMESTAMP_SECONDS({1})
    AND txns.to_address = '0xba12222222228d8ba445958a75a0704d566bf2c8'
    GROUP BY 1, 2, 3, 4
),
median_gas_prices AS (
    SELECT DISTINCT
        txns.`block_number`,
        PERCENTILE_CONT(txns.`gas_price`, 0.5) OVER(PARTITION BY txns.`block_number`) AS block_median_gas_price
    FROM `bigquery-public-data.crypto_ethereum.transactions` txns
    INNER JOIN n_swaps 
    ON txns.block_number = n_swaps.block_number
    INNER JOIN `bigquery-public-data.crypto_ethereum.blocks` blocks
    ON txns.block_number = blocks.number
    WHERE 1=1
    AND txns.from_address <> blocks.miner
    AND txns.block_timestamp >= TIMESTAMP_SECONDS({0})
    AND txns.block_timestamp < TIMESTAMP_SECONDS({1})
    AND blocks.timestamp >= TIMESTAMP_SECONDS({0})
    AND blocks.timestamp < TIMESTAMP_SECONDS({1})
    AND txns.gas_price > 10E9
)
SELECT 
    n.block_timestamp as datetime, 
    n.transaction_hash, 
    n.from_address as address,
    n_swaps,
    m.block_median_gas_price,
    CASE 
        WHEN n_swaps = 1 THEN 90000
        WHEN n_swaps = 2 THEN 140000
        WHEN n_swaps = 3 THEN 140000
        ELSE 140000
    END * m.block_median_gas_price/1E18 as eth_reimbursement
FROM n_swaps n 
INNER JOIN median_gas_prices m
ON n.block_number = m.block_number
WHERE n_swaps > 0