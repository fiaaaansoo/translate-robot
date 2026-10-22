import * as fs from 'node:fs';
import { parseFlatObject } from '../extractor/json-object.js';
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

  return {
    async translate(request: TranslateRequest): Promise<string> {
      const byLocale = recorded[request.key];
      if (typeof byLocale !== 'object' || byLocale === null || Array.isArray(byLocale)) {
        throw new Error(
          `createFixtureProvider: no recorded translation for key "${request.key}" in ${recordedPath}`,
        );
      }

      const translated = (byLocale as Record<string, unknown>)[request.targetLocale];
      if (translated === undefined) {
        throw new Error(
          `createFixtureProvider: key "${request.key}" has no recorded translation for locale "${request.targetLocale}" in ${recordedPath}`,
        );
      }
      if (typeof translated !== 'string') {
        throw new Error(
          `createFixtureProvider: key "${request.key}" locale "${request.targetLocale}" in ${recordedPath} must be a string, got ${typeof translated}`,
        );
      }
      return translated;
    },
  };
}
