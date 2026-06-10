-- Migration: Add new columns to existing tables (ADDITIVE ONLY — backward compatible)
-- These columns extend the old schema without breaking existing functionality.

-- ── feedbacks: add facilityId column for O(1) duplicate check ───────────────
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS facility_id VARCHAR(255);

-- Backfill existing data: extract facilityId from info JSON
-- (Run only if needed — safe to skip if info column has no facility data)
-- UPDATE feedbacks
-- SET facility_id = info::json->'1'->'value'->>'key'
-- WHERE facility_id IS NULL
--   AND info IS NOT NULL
--   AND info != 'null';

-- Add index for O(1) duplicate check
CREATE INDEX IF NOT EXISTS idx_feedbacks_survey_facility
  ON feedbacks (survey_key, facility_id, type);

-- Add additional performance indexes
CREATE INDEX IF NOT EXISTS idx_feedbacks_type_status ON feedbacks (type, status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks (created_at);

-- ── feedback_sections: add name column ──────────────────────────────────────
ALTER TABLE feedback_sections ADD COLUMN IF NOT EXISTS name VARCHAR(500) DEFAULT '';

-- ── feedback_options: add tiendo/danhgia/ghichu columns ─────────────────────
ALTER TABLE feedback_options ADD COLUMN IF NOT EXISTS tiendo INTEGER;
ALTER TABLE feedback_options ADD COLUMN IF NOT EXISTS danhgia INTEGER;
ALTER TABLE feedback_options ADD COLUMN IF NOT EXISTS ghichu TEXT;

-- Add index for stats queries
CREATE INDEX IF NOT EXISTS idx_feedback_options_section ON feedback_options (feedback_section_id);

-- ── form_questions: add question_key, score_weight, label columns ────────────
ALTER TABLE form_questions ADD COLUMN IF NOT EXISTS question_key VARCHAR(100) DEFAULT '';
ALTER TABLE form_questions ADD COLUMN IF NOT EXISTS score_weight DECIMAL(5,2) DEFAULT 1.00;
ALTER TABLE form_questions ADD COLUMN IF NOT EXISTS label TEXT;

-- Migrate existing 'text' column to 'label' if label is empty
UPDATE form_questions SET label = text WHERE label IS NULL OR label = '';

-- Add index for question key lookups
CREATE INDEX IF NOT EXISTS idx_form_questions_key ON form_questions (question_key);

-- ── form_options: add option_key column ─────────────────────────────────────
ALTER TABLE form_options ADD COLUMN IF NOT EXISTS option_key VARCHAR(100) DEFAULT '';

-- Migrate existing 'value' column to 'option_key' if empty
UPDATE form_options SET option_key = value WHERE option_key IS NULL OR option_key = '';

-- ── users: add refresh_token column ─────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;
