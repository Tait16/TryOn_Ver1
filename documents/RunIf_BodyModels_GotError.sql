-- Fix body_models table columns expected by backend/frontend
-- Error fixed:
-- psycopg2.errors.UndefinedColumn: column body_models.name does not exist
--
-- Run this against your PostgreSQL database.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- If the table does not exist yet, create the minimum structure first.
CREATE TABLE IF NOT EXISTS body_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE
);

-- Add columns required by the current SQLAlchemy model.
ALTER TABLE body_models
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS model_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill safe defaults for existing rows.
UPDATE body_models
SET name = COALESCE(NULLIF(TRIM(name), ''), CONCAT('Body model ', LEFT(id::TEXT, 8)))
WHERE name IS NULL OR TRIM(name) = '';

UPDATE body_models
SET model_type = COALESCE(NULLIF(TRIM(model_type), ''), 'default')
WHERE model_type IS NULL OR TRIM(model_type) = '';

UPDATE body_models
SET status = COALESCE(NULLIF(TRIM(status), ''), 'active')
WHERE status IS NULL OR TRIM(status) = '';

UPDATE body_models
SET metadata = '{}'::JSONB
WHERE metadata IS NULL;

UPDATE body_models
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE body_models
SET updated_at = NOW()
WHERE updated_at IS NULL;

-- Set defaults for future inserts.
ALTER TABLE body_models
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN model_type SET DEFAULT 'default',
  ALTER COLUMN model_type SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN metadata SET DEFAULT '{}'::JSONB,
  ALTER COLUMN metadata SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_body_models_shop_id
  ON body_models(shop_id);

CREATE INDEX IF NOT EXISTS idx_body_models_model_type
  ON body_models(model_type);

CREATE INDEX IF NOT EXISTS idx_body_models_status
  ON body_models(status);

-- Auto update updated_at.
CREATE OR REPLACE FUNCTION set_body_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_body_models_updated_at ON body_models;

CREATE TRIGGER trg_body_models_updated_at
BEFORE UPDATE ON body_models
FOR EACH ROW
EXECUTE FUNCTION set_body_models_updated_at();

COMMIT;

-- Check result
SELECT
  id,
  shop_id,
  name,
  thumbnail_url,
  model_type,
  status,
  metadata,
  created_at,
  updated_at
FROM body_models
ORDER BY updated_at DESC
LIMIT 20;
