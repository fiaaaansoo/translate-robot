import type { TranslateRequest, TranslationProvider } from './provider.js';
import { buildTranslationPrompt } from './buildPrompt.js';

export interface OpenAiCompatibleProviderOptions {
  /**
   * Base URL of an OpenAI-compatible chat completions API (e.g. Ollama's
   * or vLLM's own, both of which expose this shape) - required, no
   * implicit default. This provider exists so a self-hosted deployment
   * never sends source strings anywhere outside infrastructure the
   * caller already controls; guessing a default (such as Ollama's usual
   * http://localhost:11434/v1) would risk silently pointing at the wrong
   * host instead of failing loudly.
   */
  baseUrl: string;
  /** Model name as the target server expects it (e.g. "llama3", "llama3:70b") - required, no default. */
  model: string;
  /**
   * Most self-hosted servers need none; sent as a Bearer token only when
   * provided. Defaults to the TRANSLATE_ROBOT_LLM_API_KEY environment
   * variable, same as the Anthropic provider does for ANTHROPIC_API_KEY.
   */
  apiKey?: string;
  /** Injectable for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * A TranslationProvider backed by any OpenAI-compatible chat completions
 * API - Ollama and vLLM both expose this same shape, so one provider
 * covers both (and anything else OpenAI-compatible) instead of
 * duplicating the same request/response handling per backend.
 */
export function createOpenAiCompatibleProvider(
  options: OpenAiCompatibleProviderOptions,
): TranslationProvider {
  if (!options.baseUrl) {
    throw new Error('createOpenAiCompatibleProvider: no baseUrl configured.');
  }
  if (!options.model) {
    throw new Error('createOpenAiCompatibleProvider: no model configured.');
  }

  const url = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const model = options.model;
  const apiKey = options.apiKey ?? process.env.TRANSLATE_ROBOT_LLM_API_KEY;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async translate(request: TranslateRequest): Promise<string> {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (apiKey) {
        headers['authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          max_tokens: 256,
          messages: [{ role: 'user', content: buildTranslationPrompt(request) }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `createOpenAiCompatibleProvider: translation request failed with status ${response.status}`,
        );
      }

      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = body.choices?.[0]?.message?.content;
      if (text === undefined) {
        throw new Error('createOpenAiCompatibleProvider: response contained no message content');
      }
      return text.trim();
    },
  };
}
