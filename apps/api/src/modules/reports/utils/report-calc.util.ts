/**
 * Pure calculation utilities for GSAT report.
 * Kept stateless so they are easily unit-testable.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FacilityRow {
  id: string;
  name: string;
  type: string | null;
  category: string | null;
  address: string | null;
}

export type SurveyType = 'noi_tru' | 'ngoai_tru' | 'tiem_chung' | 'unknown';

export interface OptionData {
  ratingVote?: { value?: number };
  rating?: { value?: number };
  answerValue?: number;
  [key: string]: unknown;
}

export interface FeedbackEntry {
  id: number;
  formId: number | null;
  facilityId: string | null;   // from facility_id column OR parsed from info
  surveyType: SurveyType;      // resolved from formTypeMap
  isQR: boolean;
  optionsData: OptionData[];   // empty when using DB aggregation path
  // Pre-computed by DB aggregation query (preferred path)
  fbScore?: number;
  fbMax?: number;
}

export interface UnitGroup {
  [surveyType: string]: { self: FeedbackEntry[]; qr: FeedbackEntry[] };
}

export interface SummaryRow {
  id: string;
  type: string;
  isTotal?: boolean;
  selfUnitsReported: number;
  totalUnits: number;
  selfTotalPhieu: number;
  selfRate: string;
  qrUnitsReported: number;
  qrTotalPhieu: number;
  qrRate: string;
}

export interface AppendixRow {
  id: string;
  type: string;
  col1: string; col2: string;
  col3: string; col4: string;
  col5: string; col6: string;
  col7: string; col8: string;
}

// ─── calcRate ─────────────────────────────────────────────────────────────────
// Weighted average rating across all feedbacks (0–100 scale).
//
// Fast path: if entries have fbScore/fbMax (pre-computed by DB), use directly.
// Slow path: fallback to iterating optionsData (for non-aggregated callers).

export function calcRate(entries: FeedbackEntry[]): number {
  if (!entries.length) return 0;
  let totalW = 0, count = 0;

  for (const fb of entries) {
    // Fast path — DB already aggregated score
    if (fb.fbMax !== undefined && fb.fbScore !== undefined) {
      if (fb.fbMax > 0) { totalW += fb.fbScore / fb.fbMax; count++; }
      continue;
    }
    // Slow path — iterate options (used only if optionsData is populated)
    let fbScore = 0, fbMax = 0;
    for (const od of fb.optionsData) {
      const v = od.ratingVote?.value ?? od.rating?.value ?? od.answerValue;
      if (v != null && !isNaN(Number(v)) && Number(v) > 0) {
        fbScore += Number(v);
        fbMax += 5;
      }
    }
    if (fbMax > 0) { totalW += fbScore / fbMax; count++; }
  }

  return count === 0 ? 0 : (totalW / count) * 100;
}

// ─── summaryRow ───────────────────────────────────────────────────────────────

export function summaryRow(
  units: FacilityRow[],
  sType: string,
  label: string,
  unitGroups: Map<string, UnitGroup>,
): Omit<SummaryRow, 'id'> {
  let selfU = 0, selfP = 0, selfR = 0;
  let qrU = 0, qrP = 0, qrR = 0;

  for (const u of units) {
    const g = unitGroups.get(u.id)?.[sType];
    if (g?.self?.length) { selfU++; selfP += g.self.length; selfR += calcRate(g.self); }
    if (g?.qr?.length)   { qrU++;  qrP  += g.qr.length;   qrR  += calcRate(g.qr);   }
  }

  return {
    type: label,
    selfUnitsReported: selfU,
    totalUnits: units.length,
    selfTotalPhieu: selfP,
    selfRate: selfU > 0 ? (selfR / selfU).toFixed(2) : '0',
    qrUnitsReported: qrU,
    qrTotalPhieu: qrP,
    qrRate: qrU > 0 ? (qrR / qrU).toFixed(2) : '0',
  };
}

// ─── buildSection ─────────────────────────────────────────────────────────────

export function buildSection(opts: {
  sType: string;
  pubHosp: FacilityRow[];
  privHosp: FacilityRow[];
  tytList: FacilityRow[];
  unmapped: Record<string, { self: FeedbackEntry[]; qr: FeedbackEntry[] }>;
  unitGroups: Map<string, UnitGroup>;
  isSingleUnit: boolean;
  includeUnmapped: boolean;
  includePriv?: boolean;
  includeTyt?: boolean;
}): SummaryRow[] {
  const {
    sType, pubHosp, privHosp, tytList, unmapped, unitGroups,
    isSingleUnit, includeUnmapped, includePriv = true, includeTyt = true,
  } = opts;

  const rows: SummaryRow[] = [];
  let stt = 1;

  if (pubHosp.length > 0 || !isSingleUnit)
    rows.push({ id: String(stt++), ...summaryRow(pubHosp, sType, 'BV công lập', unitGroups) });
  if (includePriv && (privHosp.length > 0 || !isSingleUnit))
    rows.push({ id: String(stt++), ...summaryRow(privHosp, sType, 'BV ngoài công lập', unitGroups) });
  if (includeTyt && sType !== 'noi_tru' && (tytList.length > 0 || !isSingleUnit))
    rows.push({ id: String(stt++), ...summaryRow(tytList, sType, 'Trạm Y tế', unitGroups) });

  if (includeUnmapped && !isSingleUnit) {
    const uSelf = [...(unmapped[sType]?.self ?? []), ...(unmapped.unknown?.self ?? [])];
    const uQr   = [...(unmapped[sType]?.qr   ?? []), ...(unmapped.unknown?.qr   ?? [])];
    rows.push({
      id: String(stt++), type: 'Không ghi địa chỉ',
      isTotal: false,
      selfUnitsReported: 0, totalUnits: 0,
      selfTotalPhieu: uSelf.length, selfRate: calcRate(uSelf).toFixed(2),
      qrUnitsReported: 0, qrTotalPhieu: uQr.length, qrRate: calcRate(uQr).toFixed(2),
    });
  }

  // Total row
  const totUnits = [
    ...pubHosp,
    ...(includePriv ? privHosp : []),
    ...((includeTyt && sType !== 'noi_tru') ? tytList : []),
  ];
  const tot: SummaryRow = { id: '', isTotal: true, ...summaryRow(totUnits, sType, 'Tổng cộng', unitGroups) };
  if (includeUnmapped && !isSingleUnit) {
    const uSelf = [...(unmapped[sType]?.self ?? []), ...(unmapped.unknown?.self ?? [])];
    const uQr   = [...(unmapped[sType]?.qr   ?? []), ...(unmapped.unknown?.qr   ?? [])];
    tot.selfTotalPhieu += uSelf.length;
    tot.qrTotalPhieu   += uQr.length;
  }
  rows.push(tot);
  return rows;
}

// ─── buildTiemChungSection ────────────────────────────────────────────────────

export function buildTiemChungSection(opts: {
  allUnits: FacilityRow[];
  tytList: FacilityRow[];
  unmapped: Record<string, { self: FeedbackEntry[]; qr: FeedbackEntry[] }>;
  unitGroups: Map<string, UnitGroup>;
  isSingleUnit: boolean;
  userUnit: FacilityRow | null;
}): SummaryRow[] {
  const { allUnits, tytList, unmapped, unitGroups, isSingleUnit, userUnit } = opts;

  if (isSingleUnit && userUnit) {
    return [{ id: '1', ...summaryRow([userUnit], 'tiem_chung', userUnit.name, unitGroups) }];
  }

  const allBV = allUnits.filter(u => u.type === 'BV');
  const uSelf = [...(unmapped.tiem_chung?.self ?? []), ...(unmapped.unknown?.self ?? [])];
  const uQr   = [...(unmapped.tiem_chung?.qr   ?? []), ...(unmapped.unknown?.qr   ?? [])];

  const rows: SummaryRow[] = [
    { id: '1', ...summaryRow(allBV,   'tiem_chung', 'Khối Bệnh viện', unitGroups) },
    { id: '2', ...summaryRow(tytList, 'tiem_chung', 'Khối TYT',       unitGroups) },
    {
      id: '3', type: 'Không ghi địa chỉ', isTotal: false,
      selfUnitsReported: 0, totalUnits: 0,
      selfTotalPhieu: uSelf.length, selfRate: calcRate(uSelf).toFixed(2),
      qrUnitsReported: 0, qrTotalPhieu: uQr.length, qrRate: calcRate(uQr).toFixed(2),
    },
  ];

  const tot: SummaryRow = {
    id: '', isTotal: true,
    ...summaryRow([...allBV, ...tytList], 'tiem_chung', 'Tổng cộng', unitGroups),
  };
  tot.selfTotalPhieu += uSelf.length;
  tot.qrTotalPhieu   += uQr.length;
  rows.push(tot);
  return rows;
}

// ─── buildAppendix ────────────────────────────────────────────────────────────

export function buildAppendix(
  units: FacilityRow[],
  type1: string,
  type2: string,
  unitGroups: Map<string, UnitGroup>,
  groupCommune = false,
): AppendixRow[] {
  const fmtNum = (n: number) => n > 0 ? n.toLocaleString('vi-VN') : '';
  const fmtPct = (n: number) => n > 0 ? n.toFixed(2) + '%' : '';

  const rawRows = units.map(u => {
    const g = unitGroups.get(u.id);
    const s1 = g?.[type1], s2 = g?.[type2];

    let name = u.name;
    if (groupCommune) {
      const mAddr = u.address?.match(/(?:xã|phường|thị trấn|x\.|p\.)\s*([^-,.]+)/i);
      const mName = u.name.match(/(?:xã|phường|thị trấn|x\.|p\.)\s*([^-,.]+)/i);
      if (mAddr?.[1]) name = mAddr[1].trim();
      else if (mName?.[1]) name = mName[1].trim();
      else name = u.name.replace(/Trạm y tế /i, '').trim();
      name = name.normalize('NFC');
    }

    return {
      name,
      c1: s1 ? calcRate(s1.self) : 0, c2: s2 ? calcRate(s2.self) : 0,
      c3: s1?.self.length ?? 0,        c4: s2?.self.length ?? 0,
      c5: s1 ? calcRate(s1.qr) : 0,   c6: s2 ? calcRate(s2.qr) : 0,
      c7: s1?.qr.length ?? 0,          c8: s2?.qr.length ?? 0,
    };
  });

  if (groupCommune) {
    // Group TYT rows by commune name, aggregate scores
    const grouped = new Map<string, {
      c3: number; c4: number; c7: number; c8: number;
      sr1: number; sr2: number; sr5: number; sr6: number;
      a1: number; a2: number; a5: number; a6: number;
    }>();

    for (const r of rawRows) {
      if (!grouped.has(r.name)) {
        grouped.set(r.name, { c3: 0, c4: 0, c7: 0, c8: 0, sr1: 0, sr2: 0, sr5: 0, sr6: 0, a1: 0, a2: 0, a5: 0, a6: 0 });
      }
      const g = grouped.get(r.name)!;
      g.c3 += r.c3; g.c4 += r.c4; g.c7 += r.c7; g.c8 += r.c8;
      if (r.c1 > 0) { g.sr1 += r.c1; g.a1++; }
      if (r.c2 > 0) { g.sr2 += r.c2; g.a2++; }
      if (r.c5 > 0) { g.sr5 += r.c5; g.a5++; }
      if (r.c6 > 0) { g.sr6 += r.c6; g.a6++; }
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'vi'))
      .map(([nm, g], i) => ({
        id: String(i + 1), type: nm,
        col1: g.a1 > 0 ? (g.sr1 / g.a1).toFixed(2) + '%' : '',
        col2: g.a2 > 0 ? (g.sr2 / g.a2).toFixed(2) + '%' : '',
        col3: fmtNum(g.c3), col4: fmtNum(g.c4),
        col5: g.a5 > 0 ? (g.sr5 / g.a5).toFixed(2) + '%' : '',
        col6: g.a6 > 0 ? (g.sr6 / g.a6).toFixed(2) + '%' : '',
        col7: fmtNum(g.c7), col8: fmtNum(g.c8),
      }));
  }

  return rawRows.map((r, i) => ({
    id: String(i + 1), type: r.name,
    col1: fmtPct(r.c1), col2: fmtPct(r.c2),
    col3: fmtNum(r.c3), col4: fmtNum(r.c4),
    col5: fmtPct(r.c5), col6: fmtPct(r.c6),
    col7: fmtNum(r.c7), col8: fmtNum(r.c8),
  }));
}

// ─── normStr ──────────────────────────────────────────────────────────────────

export function normStr(s: string): string {
  return (s || '').toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '');
}

// ─── resolveFormTypeMap ───────────────────────────────────────────────────────

export function resolveFormTypeMap(
  forms: { id: number; name: string }[],
): Record<string, SurveyType> {
  const map: Record<string, SurveyType> = {};
  for (const f of forms) {
    const nm = normStr(f.name);
    const id = String(f.id);
    if (nm.includes('noitru'))                           map[id] = 'noi_tru';
    else if (nm.includes('ngoaitru'))                    map[id] = 'ngoai_tru';
    else if (nm.includes('tiem') || nm.includes('vaccine')) map[id] = 'tiem_chung';
    // Fallback fixed IDs
    else if (id === '19') map[id] = 'noi_tru';
    else if (id === '20') map[id] = 'ngoai_tru';
    else if (id === '21') map[id] = 'tiem_chung';
  }
  return map;
}
