import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { extractFacilityFromInfo } from '../feedbacks/utils/feedback-parser.util';
import {
  FacilityRow, FeedbackEntry, UnitGroup, SurveyType,
  buildSection, buildTiemChungSection, buildAppendix, resolveFormTypeMap,
} from './utils/report-calc.util';

// ─── Aggregated row — DB does the score math, Node.js only groups ─────────────
//
// Old approach (slow):
//   SELECT ... fo.data → returns N_feedbacks × N_options rows to Node.js
//   → JS iterates every option to extract rating value
//   → With 1M options: Node.js gets 1M+ rows, processes all in memory
//
// New approach (fast):
//   SELECT ... SUM(rating) GROUP BY feedback_id → returns N_feedbacks rows only
//   → PostgreSQL does JSON extraction + SUM in a single pass on the DB server
//   → Node.js only receives 1 row per feedback regardless of option count
//   → Typical reduction: 100k rows → 5k rows (20×+ less data transferred)

interface AggregatedFeedbackRow {
  fb_id: bigint;
  form_id: number | null;
  info: unknown;
  source: string | null;
  facility_id: string | null;
  fb_score: number;  // SUM of valid rating values for this feedback
  fb_max: number;    // SUM of max possible scores (5 per valid option)
}

// ─── FeedbackEntry with pre-computed score (no optionsData needed) ────────────

interface ScoredFeedbackEntry {
  id: number;
  formId: number | null;
  facilityId: string | null;
  surveyType: SurveyType;
  isQR: boolean;
  fbScore: number;
  fbMax: number;
}

// ─── Facility cache — SocialFacility rarely changes, TTL 10 min ───────────────

interface FacilityCache {
  data: FacilityRow[];
  byId: Map<string, FacilityRow>;
  exp: number;
}
let _facilityCache: FacilityCache | null = null;
const FACILITY_TTL = 10 * 60 * 1000;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ─── Public: GSAT report ─────────────────────────────────────────────────

  async getGSAT(surveyKey: string | null, userUnit: string | null, isAdmin: boolean) {
    const t0 = Date.now();

    // ── Step 1: parallel — survey + facilities ─────────────────────────────
    const [survey, allUnits] = await Promise.all([
      surveyKey
        ? this.prisma.survey.findUnique({ where: { id: Number(surveyKey) } })
        : this.prisma.survey.findFirst({
            where: { type: 'evaluate' },
            orderBy: { id: 'desc' },
          }),
      this.getFacilities(),
    ]);

    if (!survey) throw new Error('Không tìm thấy cuộc khảo sát. Vui lòng truyền survey_key hợp lệ.');

    const surveyId   = String(survey.id);
    const surveyName = survey.name;

    // ── Step 2: form → survey-type map ────────────────────────────────────
    const formIdsRaw: unknown = survey.formIds;
    let formIds: number[] = [];
    if (typeof formIdsRaw === 'string' && formIdsRaw.trim()) {
      try { formIds = JSON.parse(formIdsRaw); } catch { formIds = []; }
    } else if (Array.isArray(formIdsRaw)) {
      formIds = formIdsRaw as number[];
    }

    const forms = formIds.length > 0
      ? await this.prisma.form.findMany({ where: { id: { in: formIds } }, select: { id: true, name: true } })
      : await this.prisma.form.findMany({ where: { type: 'evaluate' }, select: { id: true, name: true } });

    const formTypeMap = resolveFormTypeMap(forms);

    // ── Step 3: CTE 3-phase query ──────────────────────────────────────────
    //
    // Vấn đề với JOIN thông thường khi cả 3 bảng đều lớn:
    //   feedbacks JOIN sections JOIN options → planner phải scan triệu rows
    //   rồi mới GROUP BY để thu gọn → chậm tuyến tính với kích thước bảng
    //
    // Fix: CTE phân tách thành 3 bước — PostgreSQL filter sớm ở mỗi bước:
    //
    //   Bước 1 (target_feedbacks): lấy IDs theo survey_key+type → vài nghìn IDs
    //                              dùng idx_feedbacks_survey_key_type → rất nhanh
    //
    //   Bước 2 (section_scores):   feedback_sections WHERE feedback_id IN (IDs)
    //                              → chỉ đọc sections của survey này (không scan toàn bảng)
    //                              → JOIN options chỉ trên những sections đó
    //                              → aggregate score: 1 row / feedback
    //
    //   Bước 3: join nhỏ feedbacks × section_scores (cả 2 đều nhỏ)
    //
    // Kết quả: scan chỉ proportional với kích thước survey, không phải tổng bảng.
    //
    const rawRows = await this.prisma.$queryRaw<AggregatedFeedbackRow[]>`
      WITH target_feedbacks AS (
        -- Bước 1: chỉ lấy IDs của survey này → dùng composite index
        SELECT id
        FROM   feedbacks
        WHERE  type = 'evaluate'
          AND  survey_key = ${surveyId}
      ),
      section_scores AS (
        -- Bước 2: aggregate options chỉ cho feedback thuộc survey này
        -- feedback_sections + feedback_options chỉ scan rows liên quan (nhờ FK index)
        SELECT
          fs.feedback_id,
          COALESCE(SUM(CASE WHEN rv.val > 0 THEN rv.val ELSE 0 END), 0) AS fb_score,
          COALESCE(SUM(CASE WHEN rv.val > 0 THEN 5     ELSE 0 END), 0) AS fb_max
        FROM   feedback_sections fs
        JOIN   feedback_options  fo  ON fo.feedback_section_id = fs.id
        CROSS JOIN LATERAL (
          -- Extract rating value (first non-null wins, matching JS ?? logic)
          SELECT COALESCE(
            NULLIF(TRIM((fo.data->'ratingVote'->>'value')), '')::numeric,
            NULLIF(TRIM((fo.data->'rating'->>'value')),     '')::numeric,
            NULLIF(TRIM((fo.data->>'answerValue')),         '')::numeric
          ) AS val
        ) rv
        WHERE  fs.feedback_id IN (SELECT id FROM target_feedbacks)
        GROUP  BY fs.feedback_id
      )
      -- Bước 3: join nhỏ — feedbacks (vài nghìn) × section_scores (1:1)
      SELECT
        f.id            AS fb_id,
        f.form_id,
        f.info,
        f.source,
        f.facility_id,
        COALESCE(sc.fb_score, 0) AS fb_score,
        COALESCE(sc.fb_max,   0) AS fb_max
      FROM   feedbacks f
      LEFT   JOIN section_scores sc ON sc.feedback_id = f.id
      WHERE  f.type = 'evaluate'
        AND  f.survey_key = ${surveyId}
      ORDER  BY f.id
    `;

    // ── Step 4: map raw rows → ScoredFeedbackEntry using Maps O(1) ─────────
    const { byId: facilityById } = await this.getFacilitiesCached();

    const entries: ScoredFeedbackEntry[] = rawRows.map(row => {
      const fId = row.form_id ? String(row.form_id) : null;
      const surveyType: SurveyType = (fId && formTypeMap[fId]) ? formTypeMap[fId] : 'unknown';
      const isQR = (row.source ?? '').toUpperCase() === 'QR';

      // Resolve facility: column value first (fast), fallback to info JSON parse
      let facilityId: string | null = row.facility_id ? String(row.facility_id).trim() : null;
      if (!facilityId) {
        const parsed = extractFacilityFromInfo(row.info);
        facilityId = parsed?.unitKey ?? null;
      }

      return {
        id: Number(row.fb_id),
        formId: row.form_id,
        facilityId,
        surveyType,
        isQR,
        fbScore: Number(row.fb_score),
        fbMax: Number(row.fb_max),
      };
    });

    // ── Step 5: group into unitGroups Map ──────────────────────────────────
    const unitGroups = new Map<string, UnitGroup>();
    const unmapped: Record<string, { self: ScoredFeedbackEntry[]; qr: ScoredFeedbackEntry[] }> = {
      noi_tru: { self: [], qr: [] },
      ngoai_tru: { self: [], qr: [] },
      tiem_chung: { self: [], qr: [] },
      unknown: { self: [], qr: [] },
    };

    for (const entry of entries) {
      const sType  = entry.surveyType;
      const target = entry.isQR ? 'qr' : 'self';
      const unit   = entry.facilityId ? facilityById.get(entry.facilityId) : undefined;

      if (unit) {
        if (!unitGroups.has(unit.id)) unitGroups.set(unit.id, {});
        const ug = unitGroups.get(unit.id)!;
        if (!ug[sType]) ug[sType] = { self: [], qr: [] };
        (ug[sType][target] as ScoredFeedbackEntry[]).push(entry);
      } else {
        if (!unmapped[sType]) unmapped[sType] = { self: [], qr: [] };
        (unmapped[sType][target] as ScoredFeedbackEntry[]).push(entry);
      }
    }

    // ── Step 6: categorise facilities ─────────────────────────────────────
    const pubHosp  = allUnits.filter(u => u.type === 'BV' && u.category !== 'Cơ sở y tế tư nhân');
    const privHosp = allUnits.filter(u => u.type === 'BV' && u.category === 'Cơ sở y tế tư nhân');
    const tytList  = allUnits.filter(u => u.type === 'TYT');

    // ── Step 7: apply user-unit scope ─────────────────────────────────────
    let userUnitRow: FacilityRow | null = null;
    let isSingleUnit = false;
    let scopePub  = pubHosp;
    let scopePriv = privHosp;
    let scopeTyt  = tytList;

    if (!isAdmin && userUnit) {
      userUnitRow = facilityById.get(userUnit) ?? null;
      if (userUnitRow) {
        isSingleUnit = true;
        scopePub  = userUnitRow.type === 'BV' && userUnitRow.category !== 'Cơ sở y tế tư nhân' ? [userUnitRow] : [];
        scopePriv = userUnitRow.type === 'BV' && userUnitRow.category === 'Cơ sở y tế tư nhân'  ? [userUnitRow] : [];
        scopeTyt  = userUnitRow.type === 'TYT' ? [userUnitRow] : [];
      }
    }

    // ── Step 8: build output sections ─────────────────────────────────────
    // calcRate is now replaced by the pre-computed fbScore/fbMax
    const adaptedUnitGroups = unitGroups as unknown as Map<string, UnitGroup>;
    const adaptedUnmapped = unmapped as unknown as Record<string, { self: FeedbackEntry[]; qr: FeedbackEntry[] }>;

    const sectionOpts = {
      pubHosp: scopePub, privHosp: scopePriv, tytList: scopeTyt,
      unmapped: adaptedUnmapped, unitGroups: adaptedUnitGroups, isSingleUnit,
    };

    return {
      dataNgoaiTru:  buildSection({ ...sectionOpts, sType: 'ngoai_tru', includeUnmapped: true,  includePriv: true,  includeTyt: true  }),
      dataNoiTru:    buildSection({ ...sectionOpts, sType: 'noi_tru',   includeUnmapped: true,  includePriv: true,  includeTyt: false }),
      dataTiemChung: buildTiemChungSection({ allUnits, tytList, unmapped: adaptedUnmapped, unitGroups: adaptedUnitGroups, isSingleUnit, userUnit: userUnitRow }),
      dataPhuLuc1:   buildAppendix(pubHosp,  'noi_tru',    'ngoai_tru', adaptedUnitGroups),
      dataPhuLuc2:   buildAppendix(privHosp, 'noi_tru',    'ngoai_tru', adaptedUnitGroups),
      dataPhuLuc3:   buildAppendix(tytList,  'tiem_chung', 'ngoai_tru', adaptedUnitGroups, true),
      meta: {
        surveyId,
        surveyName,
        isSingleUnit,
        userUnit: userUnitRow
          ? { id: userUnitRow.id, name: userUnitRow.name, type: userUnitRow.type, category: userUnitRow.category }
          : null,
        totalFeedbacks: entries.length,
        formTypeMap,
        queryMs: Date.now() - t0,
      },
    };
  }

  // ─── Facility cache ───────────────────────────────────────────────────────

  private async getFacilitiesCached(): Promise<FacilityCache> {
    if (_facilityCache && _facilityCache.exp > Date.now()) return _facilityCache;

    const data = await this.prisma.socialFacility.findMany({
      select: { id: true, name: true, type: true, category: true, address: true },
      orderBy: { name: 'asc' },
    });

    const byId = new Map<string, FacilityRow>(data.map(f => [f.id, f]));
    _facilityCache = { data, byId, exp: Date.now() + FACILITY_TTL };
    return _facilityCache;
  }

  private async getFacilities(): Promise<FacilityRow[]> {
    return (await this.getFacilitiesCached()).data;
  }

  invalidateFacilityCache() {
    _facilityCache = null;
  }
}
