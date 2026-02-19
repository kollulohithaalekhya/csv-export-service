INSERT INTO users (name, email)
SELECT
  'User ' || g,
  'user' || g || '@example.com'
FROM generate_series(1001, 1000000) AS g;
