/**
 * Check if a flat list of permission names includes a required permission.
 * Supports dot-notation hierarchy: having "reflect" grants "reflect.form.view".
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  if (!userPermissions.length) return false;

  // Exact match
  if (userPermissions.includes(required)) return true;

  // Parent match: "reflect" covers "reflect.form.view"
  const parts = required.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(0, i).join('.');
    if (userPermissions.includes(parent)) return true;
  }

  return false;
}

/**
 * Flatten nested permission objects to a string array.
 * Handles both string[] and nested { name, children } structures.
 */
export function flattenPermissions(perms: unknown): string[] {
  if (!perms) return [];
  if (Array.isArray(perms)) {
    return perms.flatMap((p) => {
      if (typeof p === 'string') return [p];
      if (typeof p === 'object' && p !== null && 'name' in p) {
        const obj = p as { name: string; children?: unknown[] };
        return [obj.name, ...flattenPermissions(obj.children)];
      }
      return [];
    });
  }
  return [];
}
