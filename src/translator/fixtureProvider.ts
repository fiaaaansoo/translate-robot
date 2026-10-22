import * as fs from 'node:fs';
import type { TranslateRequest, TranslationProvider } from './provider.js';

type RecordedTranslations = Record<string, Record<string, string>>;

/**
 * A TranslationProvider backed by a static JSON file of pre-recorded
 * translations (fixtures/toy-repo/translations.recorded.json). Used for the
 * toy-repo dry-run and for tests, where calling a real LLM is neither
 * desired nor possible without an API key.
 */
export function createFixtureProvider(recordedPath: string): TranslationProvider {
  const raw = fs.readFileSync(recordedPath, 'utf-8');
  let recorded: RecordedTranslations;
  try {
    recorded = JSON.parse(raw) as RecordedTranslations;
  } catch (cause) {
    throw new Error(`createFixtureProvider: ${recordedPath} is not valid JSON`, { cause });
  }

  return {
    async translate(request: TranslateRequest): Promise<string> {
      const byLocale = recorded[request.key];
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
