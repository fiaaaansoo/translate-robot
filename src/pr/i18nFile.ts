import { parseFlatObject } from '../extractor/json-object.js';

/**
 * Merges newly translated keys into an existing locale JSON file's text,
 * preserving every key that isn't being updated. `existingRaw` is
 * undefined when the target locale file doesn't exist yet (first
 * translation into that locale) - treated as an empty catalog, not an
 * error.
 */
export function mergeTranslations(
  existingRaw: string | undefined,
  targetPath: string,
  updates: Record<string, string>,
): string {
  const existing = existingRaw === undefined ? {} : parseFlatObject(existingRaw, targetPath);
  return JSON.stringify({ ...existing, ...updates }, null, 2) + '\n';
}
