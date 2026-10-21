import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFlatObject } from './json-object.js';
import type { DiffEntry } from './diff.js';
import type { ExtractionResult, I18nMapping } from '../types.js';

/**
 * Parses and validates a key->component mapping file (fixtures/toy-repo/
 * i18n-map.json format, documented in fixtures/toy-repo/README.md). Throws
 * naming the exact problem (bad JSON, wrong shape, or which key's entry is
 * malformed) — a bad mapping is a setup error, not a per-key one, so it
 * fails fast instead of being folded into ExtractionResult.errors.
 */
export function parseMapping(raw: string): I18nMapping {
  const parsed = parseFlatObject(raw, 'fichier de mapping');

  for (const [key, entry] of Object.entries(parsed)) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(
        `fichier de mapping : l'entrée "${key}" doit être un objet {component, selector}`,
      );
    }
    const { component, selector } = entry as Record<string, unknown>;
    if (typeof component !== 'string' || component.length === 0) {
      throw new Error(
        `fichier de mapping : l'entrée "${key}" n'a pas de "component" (chaîne non vide)`,
      );
    }
    if (typeof selector !== 'string' || selector.length === 0) {
      throw new Error(
        `fichier de mapping : l'entrée "${key}" n'a pas de "selector" (chaîne non vide)`,
      );
    }
  }

  return parsed as I18nMapping;
}

/**
 * Resolves each diffed i18n key against the mapping, producing either a
 * ready-to-measure ExtractedChange or an explicit per-key error (unmapped
 * key, or mapped component file missing on disk) — never throws, so one
 * bad key never blocks the others in the same run.
 */
export function resolveContext(
  diffEntries: DiffEntry[],
  mapping: I18nMapping,
  mappingPath: string,
): ExtractionResult {
  const result: ExtractionResult = { changes: [], errors: [] };
  const mappingDir = path.dirname(mappingPath);

  for (const { key, sourceText } of diffEntries) {
    const entry = mapping[key];
    if (!entry) {
      result.errors.push({
        key,
        reason: `aucune entrée pour "${key}" dans le fichier de mapping (${mappingPath})`,
      });
      continue;
    }

    const componentPath = path.resolve(mappingDir, entry.component);
    if (!fs.existsSync(componentPath)) {
      result.errors.push({
        key,
        reason: `composant introuvable pour "${key}" : ${componentPath}`,
      });
      continue;
    }

    result.changes.push({
      key,
      sourceText,
      componentPath,
      measureTarget: entry.selector,
    });
  }

  return result;
}
