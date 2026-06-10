-- ============================================================
-- Migration: Add missing columns to existing tables
-- Safe: additive only, no DROP, no data loss
-- Applied: 2026-06-10
-- ============================================================

-- 1. permissions: add key + parent_key columns
--    Required for dot-notation permission system (e.g. "users.view")
ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS key        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS parent_key VARCHAR(200);

-- Backfill key from name for existing records
UPDATE permissions
SET key = lower(regexp_replace(name, '\s+', '.', 'g'))
WHERE key IS NULL;

-- NOTE: key stays NULLABLE so old backend can still INSERT permissions
--       (old Sequelize model doesn't know about key field)
-- Partial unique index: only enforce uniqueness when key IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_permissions_key
  ON permissions(key) WHERE key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_permissions_parent_key ON permissions(parent_key);

-- 2. feedbacks: add facility_id + source columns
--    facility_id: extracted from info JSON for O(1) duplicate check
--    source: "QR" | "WEB" tracking
ALTER TABLE feedbacks
  ADD COLUMN IF NOT EXISTS facility_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source      VARCHAR(10);

-- Backfill facility_id from existing info JSON where possible
UPDATE feedbacks
SET facility_id = info->>'facilityId'
WHERE facility_id IS NULL
  AND info IS NOT NULL
  AND info->>'facilityId' IS NOT NULL;

-- Index for composite duplicate check
CREATE INDEX IF NOT EXISTS idx_feedbacks_survey_facility_type
  ON feedbacks(survey_key, facility_id, type);

CREATE INDEX IF NOT EXISTS idx_feedbacks_facility_id
  ON feedbacks(facility_id);

-- 3. survey_facilities junction table
--    Links surveys to facilities for multi-facility surveys
CREATE TABLE IF NOT EXISTS survey_facilities (
  survey_id   INTEGER     NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  facility_id VARCHAR(50) NOT NULL,
  PRIMARY KEY (survey_id, facility_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_survey_facilities
  ON survey_facilities(survey_id, facility_id);

-- 4. Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status    ON posts(status);
