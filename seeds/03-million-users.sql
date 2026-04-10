INSERT INTO users (name, email, country_code, subscription_tier, lifetime_value)
SELECT
  'User ' || g,
  'user' || g || '@example.com',
  CASE WHEN g % 2 = 0 THEN 'IN' ELSE 'US' END,
  CASE WHEN g % 3 = 0 THEN 'premium' ELSE 'basic' END,
  (random() * 10000)::int
FROM generate_series(1001, 1000000) AS g;