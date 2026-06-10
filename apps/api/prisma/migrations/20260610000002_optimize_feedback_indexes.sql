-- ============================================================
-- Migration: Optimize feedback query performance
-- Safe: additive indexes only, no schema changes
-- Applied: 2026-06-10
-- ============================================================

-- 1. feedback_sections: index on feedback_id for JOIN
--    Without this: full scan of feedback_sections for every feedback
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fs_feedback_id
  ON feedback_sections(feedback_id);

-- 2. feedback_options: index on feedback_section_id for JOIN
--    Without this: full scan of feedback_options (millions of rows)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fo_section_id
  ON feedback_options(feedback_section_id);

-- 3. feedbacks: composite (survey_key, type) — the two main WHERE filters
--    Replaces separate single-column scans with one targeted index scan
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedbacks_survey_key_type
  ON feedbacks(survey_key, type)
  WHERE survey_key IS NOT NULL;

-- 4. feedback_options: partial GIN index on rating fields inside data JSON
--    Speeds up: data->'ratingVote', data->'rating', data->>'answerValue'
--    Only index rows that actually have rating data (partial = smaller index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fo_data_rating
  ON feedback_options USING GIN (data jsonb_path_ops)
  WHERE data IS NOT NULL;
