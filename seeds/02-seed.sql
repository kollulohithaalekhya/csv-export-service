INSERT INTO users (name, email)
SELECT
  'User ' || g,
  'user' || g || '@example.com'
FROM generate_series(1, 1000) AS g;
