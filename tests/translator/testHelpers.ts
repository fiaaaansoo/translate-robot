import type { TranslateRequest } from '../../src/translator/provider.js';

export function baseRequest(overrides: Partial<TranslateRequest> = {}): TranslateRequest {
  return {
    key: 'greeting',
    sourceText: 'Hello',
    targetLocale: 'de',
    targetWidthPx: 200,
    previousAttempts: [],
    ...overrides,
  };
}
