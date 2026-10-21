import * as fs from 'node:fs';
import { diffI18nCatalogs } from './diff.js';
import { readI18nCatalog } from './io.js';
import { parseMapping, resolveContext } from './mapping.js';
import type { ExtractionResult } from '../types.js';

export { diffI18nCatalogs } from './diff.js';
export { parseI18nCatalog, readI18nCatalog } from './io.js';
export { parseMapping, resolveContext } from './mapping.js';
export type { DiffEntry } from './diff.js';

export interface ExtractChangesOptions {
  /** Path to the i18n catalog before the change. Missing = empty catalog (first-ever add). */
  oldI18nPath: string;
  /** Path to the i18n catalog after the change. Must exist. */
  newI18nPath: string;
  /** Path to the key->component mapping file. Must exist. */
  mappingPath: string;
}

/**
 * Public entry point for task 07's CLI: diffs the two i18n catalogs and
 * resolves each changed key against the mapping, in one call. A missing
 * `newI18nPath` or `mappingPath` throws (both are required inputs); a
 * missing `oldI18nPath` is treated as an empty catalog, since "the i18n
 * file didn't exist before" is exactly the first-ever-add case this
 * pipeline needs to handle, not an error.
 */
export function extractChangesFromFiles(options: ExtractChangesOptions): ExtractionResult {
  const oldCatalog = fs.existsSync(options.oldI18nPath) ? readI18nCatalog(options.oldI18nPath) : {};
  const newCatalog = readI18nCatalog(options.newI18nPath);
  const mapping = parseMapping(fs.readFileSync(options.mappingPath, 'utf8'));

  const diffEntries = diffI18nCatalogs(oldCatalog, newCatalog);
  return resolveContext(diffEntries, mapping, options.mappingPath);
}
