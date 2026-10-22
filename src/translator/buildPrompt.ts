import type { TranslateRequest } from './provider.js';

/**
 * Shared across every TranslationProvider backend: the instruction text is
 * part of the product's behavior (what the model is asked to do), not of
 * any one backend's wire format, so it lives here once rather than
 * drifting between an Anthropic-specific and an OpenAI-compatible copy.
 */
export function buildTranslationPrompt(request: TranslateRequest): string {
  const lines = [
    `Translate the following UI string from English to locale "${request.targetLocale}".`,
    `It must fit visually within ${request.targetWidthPx}px of rendered width - prefer the shortest natural phrasing.`,
    `Reply with ONLY the translated text, no quotes, no explanation.`,
    ``,
    `Source text: ${request.sourceText}`,
  ];

  if (request.previousAttempts.length > 0) {
    lines.push('', 'Previous attempts overflowed the available width - make the next one shorter:');
    for (const attempt of request.previousAttempts) {
      lines.push(
        `- "${attempt.text}" (${attempt.measuredWidth}px, needed ${attempt.clientWidth}px)`,
      );
    }
  }

  return lines.join('\n');
}
