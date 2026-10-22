import type { TranslateRequest, TranslationProvider } from './provider.js';

const DEFAULT_MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export interface AnthropicProviderOptions {
  /** Defaults to the ANTHROPIC_API_KEY environment variable. */
  apiKey?: string;
  /** Defaults to the TRANSLATE_ROBOT_LLM_MODEL environment variable, else DEFAULT_MODEL. */
  model?: string;
  /** Injectable for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

function buildPrompt(request: TranslateRequest): string {
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

/**
 * A TranslationProvider backed by the Anthropic Messages API. The API key
 * is read from an environment variable (or injected explicitly for
 * testing) - never hardcoded, never included in any error message this
 * module throws, since errors can end up in logs or PR descriptions.
 */
export function createAnthropicProvider(
  options: AnthropicProviderOptions = {},
): TranslationProvider {
  const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const model = options.model ?? process.env.TRANSLATE_ROBOT_LLM_MODEL ?? DEFAULT_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!apiKey) {
    throw new Error(
      'createAnthropicProvider: no API key configured. Set ANTHROPIC_API_KEY or pass { apiKey }.',
    );
  }

  return {
    async translate(request: TranslateRequest): Promise<string> {
      const response = await fetchImpl(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: 256,
          messages: [{ role: 'user', content: buildPrompt(request) }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `createAnthropicProvider: translation request failed with status ${response.status}`,
        );
      }

      const body = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = body.content?.find((block) => block.type === 'text')?.text;
      if (text === undefined) {
        throw new Error('createAnthropicProvider: response contained no text content block');
      }
      return text.trim();
    },
  };
}
