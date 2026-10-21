import * as fs from 'node:fs';
import { parseFlatObject } from './json-object.js';
import type { I18nCatalog } from '../types.js';

/**
 * Parses and validates a flat i18n catalog: a JSON object whose every value
 * is a string. No pluralization, no nesting — that is explicitly v2+ scope
 * (cf. PRODUCT.md). Throws with a message naming the exact problem (bad
 * JSON, wrong shape, or which key has a non-string value) rather than
 * returning a partially-valid catalog.
 */
export function parseI18nCatalog(raw: string): I18nCatalog {
  const parsed = parseFlatObject(raw, 'fichier i18n');

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') {
      throw new Error(
        `fichier i18n : la clé "${key}" n'a pas une valeur texte (pas de pluriels/imbrication en v1)`,
      );
    }
  }

  return parsed as I18nCatalog;
}

/**
 * Reads and parses a flat i18n catalog from disk. A missing file is
 * reported by the caller's own fs error (ENOENT) rather than swallowed
 * here — callers that want "missing file = empty catalog" (the
 * first-ever-add case) check existence before calling this.
 */
export function readI18nCatalog(path: string): I18nCatalog {
  const raw = fs.readFileSync(path, 'utf8');
  return parseI18nCatalog(raw);
}
