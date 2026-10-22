/** True when `value` is a plain, non-array, non-null object. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses JSON and validates it is a flat, non-array object — the shape
 * both the i18n catalog and the key->component mapping files require.
 * Shared so a future fix to this check (e.g. BOM handling) lands once,
 * not once per caller.
 */
export function parseFlatObject(raw: string, kind: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new Error(`${kind} : JSON invalide (${(cause as Error).message})`);
  }

  if (!isPlainObject(parsed)) {
    throw new Error(`${kind} : doit être un objet plat, pas un tableau ou une valeur simple`);
  }

  return parsed;
}
