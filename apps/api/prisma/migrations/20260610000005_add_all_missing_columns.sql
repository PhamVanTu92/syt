-- Add all columns that exist in Prisma schema but may be missing in DB
-- All additive only — no drops, no renames

-- users
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS key VARCHAR(255);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS parent_key VARCHAR(255);
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS parent_id INTEGER;

-- roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
