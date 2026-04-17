DO $$
DECLARE
  start_id INT := 1001;
  batch_size INT := 50000;
  end_id INT;
BEGIN
  WHILE start_id <= 1000000 LOOP
    end_id := LEAST(start_id + batch_size - 1, 1000000);

    INSERT INTO users (name, email, country_code, subscription_tier, lifetime_value)
    SELECT
      'User ' || g,
      'user' || g || '@example.com',
      CASE WHEN g % 2 = 0 THEN 'IN' ELSE 'US' END,
      CASE WHEN g % 3 = 0 THEN 'premium' ELSE 'basic' END,
      (random() * 10000)::int
    FROM generate_series(start_id, end_id) AS g;

    start_id := start_id + batch_size;
  END LOOP;
END $$;