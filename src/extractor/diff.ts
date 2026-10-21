import type { I18nCatalog } from '../types.js';

/** One i18n key whose source text was added or changed between two catalogs. */
export interface DiffEntry {
  key: string;
  sourceText: string;
}

/**
 * Compares two flat i18n catalogs and returns the keys that were added or
 * whose value changed, in the order they appear in `newCatalog`. A key
 * removed in `newCatalog` is never reported — removals are out of scope
 * for translation (nothing left to translate).
 */
export function diffI18nCatalogs(oldCatalog: I18nCatalog, newCatalog: I18nCatalog): DiffEntry[] {
  const entries: DiffEntry[] = [];
  for (const key of Object.keys(newCatalog)) {
    const newValue = newCatalog[key];
    const oldValue = oldCatalog[key];
    if (newValue !== undefined && newValue !== oldValue) {
      entries.push({ key, sourceText: newValue });
    }
  }
  return entries;
}
