/**
 * Unified facility extraction from feedback.info JSON.
 * Single source of truth — dùng ở createFeedback, getFeedbacks filter, stats.
 *
 * info structure (most common):
 * {
 *   "1": { "key": "1", "value": { "key": "bv-abc", "value": "Bệnh viện ABC" } },
 *   "2": { "key": "2", "value": "2026-03-17T17:00:00.000Z" },
 *   "3": { "key": "3", "value": { "key": "1", "value": "Người bệnh tự điền" } }
 * }
 */
export interface FacilityInfo {
  unitKey: string;
  unitName: string;
}

export function extractFacilityFromInfo(info: unknown): FacilityInfo | null {
  if (!info || typeof info !== 'object') return null;

  const infoObj = info as Record<string, unknown>;

  // Format 1: Object with numeric keys, first entry is facility
  const numericKeys = Object.keys(infoObj)
    .filter((k) => /^\d+$/.test(k))
    .sort((a, b) => Number(a) - Number(b));

  for (const key of numericKeys) {
    const entry = infoObj[key];
    if (!entry || typeof entry !== 'object') continue;

    const entryObj = entry as Record<string, unknown>;
    const value = entryObj['value'];

    if (value && typeof value === 'object') {
      const valueObj = value as Record<string, unknown>;
      const unitKey = String(valueObj['key'] ?? '');
      const unitName = String(valueObj['value'] ?? '');
      if (unitKey && unitKey !== 'undefined') {
        return { unitKey, unitName };
      }
    }
  }

  // Format 2: Direct facility_id field
  if (typeof infoObj['facility_id'] === 'string') {
    return { unitKey: infoObj['facility_id'] as string, unitName: String(infoObj['facility_name'] ?? '') };
  }

  // Format 3: unit field
  if (typeof infoObj['unit'] === 'string') {
    return { unitKey: infoObj['unit'] as string, unitName: String(infoObj['unit_name'] ?? '') };
  }

  return null;
}

export function extractDateFromInfo(info: unknown): Date | null {
  if (!info || typeof info !== 'object') return null;
  const infoObj = info as Record<string, unknown>;
  const numericKeys = Object.keys(infoObj).filter((k) => /^\d+$/.test(k)).sort();

  for (const key of numericKeys) {
    const entry = infoObj[key] as Record<string, unknown> | null;
    if (!entry) continue;
    const value = entry['value'];
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}
