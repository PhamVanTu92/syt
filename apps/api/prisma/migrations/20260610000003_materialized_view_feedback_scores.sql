-- ============================================================
-- OPTIONAL: Materialized View — feedback_scores
-- Dùng khi cả 3 bảng đều rất lớn và report chạy thường xuyên.
-- Precompute fb_score + fb_max cho toàn bộ feedbacks.
-- Query report đổi thành: feedbacks JOIN feedback_scores (1:1, cực nhanh)
--
-- Trade-off:
--   + Query report: O(survey_size) thay vì O(table_size)
--   - Cần REFRESH CONCURRENTLY sau mỗi lần insert feedbacks mới
--     (chạy bằng pg_cron: mỗi 5 phút hoặc trigger từ backend)
--
-- KHÔNG apply ngay — đợi khi tốc độ CTE chưa đủ.
-- ============================================================

-- Tạo materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS feedback_scores AS
  SELECT
    fs.feedback_id,
    COALESCE(SUM(CASE WHEN rv.val > 0 THEN rv.val ELSE 0 END), 0) AS fb_score,
    COALESCE(SUM(CASE WHEN rv.val > 0 THEN 5     ELSE 0 END), 0) AS fb_max
  FROM   feedback_sections fs
  JOIN   feedback_options  fo  ON fo.feedback_section_id = fs.id
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      NULLIF(TRIM((fo.data->'ratingVote'->>'value')), '')::numeric,
      NULLIF(TRIM((fo.data->'rating'->>'value')),     '')::numeric,
      NULLIF(TRIM((fo.data->>'answerValue')),         '')::numeric
    ) AS val
  ) rv
  GROUP BY fs.feedback_id
WITH DATA;

-- Index để JOIN với feedbacks cực nhanh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_feedback_scores_id
  ON feedback_scores(feedback_id);

-- Refresh lệnh (chạy định kỳ hoặc sau khi insert feedback mới):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY feedback_scores;
-- (CONCURRENTLY không lock bảng, an toàn cho production)
