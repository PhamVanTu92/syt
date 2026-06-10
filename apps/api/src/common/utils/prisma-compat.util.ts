/**
 * prisma-compat.util.ts
 *
 * Bridge between application-layer string values and the actual DB column types
 * that were inherited from the legacy Sequelize backend.
 *
 *   User.status   → Int   (1=active, 0=inactive, -1=pending)
 *   User.role     → enum_users_role Prisma enum ('admin'|'user'|'office'|'leader')
 *   Survey.status → Boolean?  (true=active, false=inactive)
 *   Survey.formIds → String  (JSON-serialised number[])
 *
 * NOTE: We deliberately avoid importing `$Enums` from '@prisma/client' because
 * it may not be generated for all schema configurations. Instead we use explicit
 * string-union type aliases that are structurally identical to the Prisma types.
 */

// ─── User.status  (Int column) ────────────────────────────────────────────────

export const USER_STATUS = {
  active: 1,
  inactive: 0,
  pending: -1,
} as const;

export type UserStatusString = keyof typeof USER_STATUS;

/** 'active' | 'inactive' | 'pending'  →  1 | 0 | -1 */
export function toUserStatus(s: string | undefined | null): number | undefined {
  if (s == null) return undefined;
  return USER_STATUS[s as UserStatusString] ?? USER_STATUS.pending;
}

/** 1 | 0 | -1  →  'active' | 'inactive' | 'pending' */
export function fromUserStatus(n: number | null | undefined): UserStatusString {
  if (n === USER_STATUS.active) return 'active';
  if (n === USER_STATUS.inactive) return 'inactive';
  return 'pending';
}

// ─── User.role  (Prisma enum  enum_users_role) ────────────────────────────────
// The DB enum values happen to be valid string literals, so we cast via `unknown`.

type UserRoleValue = 'admin' | 'user' | 'office' | 'leader';

/**
 * Cast a plain string to the enum_users_role type expected by Prisma.
 * Returns `undefined` for null/undefined inputs.
 */
export function toUserRole(s: string | undefined | null): UserRoleValue | undefined {
  if (s == null) return undefined;
  return s as UserRoleValue;
}

// ─── Survey.status  (Boolean? column) ────────────────────────────────────────

/** 'active' → true  |  anything else → false  |  undefined → undefined */
export function toSurveyStatus(s: string | undefined | null): boolean | undefined {
  if (s == null) return undefined;
  return s === 'active';
}

/** true → 'active'  |  false/null/undefined → 'inactive' */
export function fromSurveyStatus(b: boolean | null | undefined): string {
  return b === true ? 'active' : 'inactive';
}

// ─── Survey.formIds  (String column — stores JSON array) ─────────────────────

/** number[] | undefined  →  JSON string stored in DB */
export function toSurveyFormIds(ids: number[] | string | undefined | null): string {
  if (ids == null) return '[]';
  if (typeof ids === 'string') return ids; // already serialised
  return JSON.stringify(ids);
}

/** DB string  →  number[] for API responses */
export function fromSurveyFormIds(s: string | null | undefined): number[] {
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s);
    return Array.isArray(parsed) ? (parsed as number[]) : [];
  } catch {
    return [];
  }
}
