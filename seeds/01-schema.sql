CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS TABLE (UPDATED)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  country_code TEXT,
  subscription_tier TEXT,
  lifetime_value NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

-- INDEXES (IMPORTANT FOR PERFORMANCE)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country_code);
CREATE INDEX IF NOT EXISTS idx_users_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_ltv ON users(lifetime_value);


-- EXPORTS TABLE (UPDATED)
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL,
  progress INT DEFAULT 0,
  file_path TEXT,
  error TEXT,
  filters JSONB,       -- 🔥 REQUIRED
  columns TEXT,        -- 🔥 REQUIRED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);