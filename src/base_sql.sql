DECLARE week_1_start, week_start, week_end TIMESTAMP;
DECLARE week_number INT64;
DECLARE pool_addresses, excluded_lps ARRAY<STRING>;

SET week_number = {week_number};
SET week_1_start = TIMESTAMP('2020-06-01 00:00:00+00');
SET week_start = TIMESTAMP_ADD(week_1_start, INTERVAL ((week_number-1)*7) DAY);
SET week_end = TIMESTAMP_ADD(week_start, INTERVAL 7 DAY);
SET pool_addresses = [
  '{pool_addresses}'
];
SET excluded_lps = [
  '{excluded_lps}'
];

WITH BLOCKS_OF_THE_WEEK AS ( 
  SELECT 
    a.number
  FROM `{blocks_table}` a
  INNER JOIN `{blocks_table}` b
  ON a.number+1 = b.number
  WHERE b.timestamp >= week_start
  AND a.timestamp <= week_end
)
SELECT week_start as block_timestamp, address as lp_address, token_address as pool_address, balance as delta
FROM `{lm_state_table}`
WHERE token_address IN UNNEST(pool_addresses)
AND address NOT IN UNNEST(excluded_lps)
AND balance > 0
AND block_number = (SELECT MIN(number) FROM BLOCKS_OF_THE_WEEK)

UNION ALL

SELECT block_timestamp, from_address as lp_address, token_address as pool_address, -CAST(value AS FLOAT64) as delta 
FROM `{lm_transfers_table}`
WHERE token_address IN UNNEST(pool_addresses)
AND from_address NOT IN UNNEST(excluded_lps)
AND block_number > (SELECT MIN(number) FROM BLOCKS_OF_THE_WEEK)
AND block_number <= (SELECT MAX(number) FROM BLOCKS_OF_THE_WEEK)

UNION ALL

SELECT block_timestamp, to_address as lp_address, token_address as pool_address, CAST(value AS FLOAT64) as delta 
FROM `{lm_transfers_table}`
WHERE token_address IN UNNEST(pool_addresses)
AND to_address NOT IN UNNEST(excluded_lps)
AND block_number > (SELECT MIN(number) FROM BLOCKS_OF_THE_WEEK)
AND block_number <= (SELECT MAX(number) FROM BLOCKS_OF_THE_WEEK)