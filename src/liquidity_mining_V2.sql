DECLARE week_1_start, week_start, week_end TIMESTAMP;
DECLARE week_number INT64;
DECLARE pool_addresses ARRAY<STRING>;

SET week_number = {0};
SET week_1_start = TIMESTAMP('2020-06-01 00:00:00+00');
SET week_start = TIMESTAMP_ADD(week_1_start, INTERVAL ((week_number-1)*7) DAY);
SET week_end = TIMESTAMP_ADD(week_start, INTERVAL 7 DAY);
SET pool_addresses = [
  '{1}'
];

-- FIRST WE NEED TO GET A LIST OF ALL THE BLOCKS RELEVANT TO THE WEEK
-- AND HOW LONG THE STATE THEY PRODUCED LASTED FOR IN SECONDS.
-- THIS INCLUDES THE LAST BLOCK BEFORE THE START OF THE WEEK, BUT WE 
-- ONLY COUNT THE NUMBER OF SECONDS WITHIN THE WEEK. SIMILARLY, FOR 
-- THE LAST BLOCK OF THE WEEK WE ONLY COUNT THE NUMBER OF SECONDS
-- WITHIN THE WEEK  
WITH INTERVALS AS ( 
  SELECT 
    a.number, 
    TIMESTAMP_DIFF(
      IF(week_end > b.timestamp, b.timestamp, week_end),
      IF(week_start < a.timestamp, a.timestamp, week_start),
      SECOND
    ) AS delta_t
  FROM `{2}` a
  INNER JOIN `{2}` b
  ON a.number+1 = b.number
  WHERE b.timestamp >= week_start
  AND a.timestamp <= week_end
),
BPT_SUPPLY AS (
  SELECT block_number, token_address, SUM(balance) AS supply
  FROM `{3}`
  WHERE token_address IN UNNEST(pool_addresses)
  AND address <> '0x0000000000000000000000000000000000000000'
  AND address <> '0xba12222222228d8ba445958a75a0704d566bf2c8'
  AND balance > 0
  GROUP BY block_number, token_address
),
LPS_SHARES AS (
  SELECT a.block_number, a.token_address, address, balance/supply AS share
  FROM `{3}` a
  INNER JOIN BPT_SUPPLY b
  ON a.block_number = b.block_number
  AND a.token_address = b.token_address
  WHERE a.token_address IN UNNEST(pool_addresses)
  AND address <> '0x0000000000000000000000000000000000000000'
  AND address <> '0xba12222222228d8ba445958a75a0704d566bf2c8'
  AND balance > 0
),
SHARES_INTEGRATOR AS (
  SELECT token_address, SUM(share*delta_t) as share_integral
  FROM LPS_SHARES a
  INNER JOIN INTERVALS b
  ON a.block_number = b.number
  GROUP BY token_address
),
TIME_WEIGHTED_SHARE AS (
  SELECT address, a.token_address, (SUM(share*delta_t)/share_integral) as time_weighted_share
  FROM LPS_SHARES a
  INNER JOIN INTERVALS b
  ON a.block_number = b.number
  INNER JOIN SHARES_INTEGRATOR c
  ON a.token_address = c.token_address
  GROUP BY address, token_address, share_integral
),
RESULTS AS (
  SELECT * FROM TIME_WEIGHTED_SHARE
)
SELECT 
  R.token_address as pool_address, 
  R.address as miner, 
  R.time_weighted_share as tw_share
FROM RESULTS R