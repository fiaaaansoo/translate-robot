import * as fs from 'node:fs';
import { isPlainObject, parseFlatObject } from '../extractor/json-object.js';
import type { TranslateRequest, TranslationProvider } from './provider.js';

/**
 * A TranslationProvider backed by a static JSON file of pre-recorded
 * translations (fixtures/toy-repo/translations.recorded.json). Used for the
 * toy-repo dry-run and for tests, where calling a real LLM is neither
 * desired nor possible without an API key.
 */
export function createFixtureProvider(recordedPath: string): TranslationProvider {
  const raw = fs.readFileSync(recordedPath, 'utf-8');
  const recorded = parseFlatObject(raw, recordedPath);

  // Validate the whole structure up front (matches parseI18nCatalog's eager
  // validation in extractor/io.ts) rather than only noticing a malformed
  // entry whenever some future translate() call happens to touch it.
  for (const [key, byLocale] of Object.entries(recorded)) {
    if (!isPlainObject(byLocale)) {
      throw new Error(
        `createFixtureProvider: recorded translations for key "${key}" in ${recordedPath} must be an object of locale -> text`,
      );
    }
    for (const [locale, value] of Object.entries(byLocale)) {
      if (typeof value !== 'string') {
        throw new Error(
          `createFixtureProvider: key "${key}" locale "${locale}" in ${recordedPath} must be a string, got ${typeof value}`,
        );
      }
    }
  }

  const typedRecorded = recorded as Record<string, Record<string, string>>;

  return {
    async translate(request: TranslateRequest): Promise<string> {
      const byLocale = typedRecorded[request.key];
      if (!byLocale) {
        throw new Error(
          `createFixtureProvider: no recorded translation for key "${request.key}" in ${recordedPath}`,
        );
      }
      const translated = byLocale[request.targetLocale];
      if (translated === undefined) {
        throw new Error(
          `createFixtureProvider: key "${request.key}" has no recorded translation for locale "${request.targetLocale}" in ${recordedPath}`,
        );
      }
      return translated;
    },
  };
}
