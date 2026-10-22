import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnthropicProvider } from '../../src/translator/anthropicProvider.js';
import type { TranslateRequest } from '../../src/translator/provider.js';

function baseRequest(overrides: Partial<TranslateRequest> = {}): TranslateRequest {
  return {
    key: 'greeting',
    sourceText: 'Hello',
    targetLocale: 'de',
    targetWidthPx: 200,
    previousAttempts: [],
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const SECRET_KEY = 'sk-ant-super-secret-value-do-not-leak';

describe('createAnthropicProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
  });

  it('throws if no API key is configured anywhere', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => createAnthropicProvider()).toThrow(/API key/);
  });

  it('returns the trimmed text of the first text content block', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: '  Hallo  ' }] }));
    const provider = createAnthropicProvider({ apiKey: SECRET_KEY, fetchImpl });

    await expect(provider.translate(baseRequest())).resolves.toBe('Hallo');
  });

  it('sends the API key in the x-api-key header, not in the URL or body', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'Hallo' }] }));
    const provider = createAnthropicProvider({ apiKey: SECRET_KEY, fetchImpl });
    await provider.translate(baseRequest());

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(SECRET_KEY);
    expect(String(init.body)).not.toContain(SECRET_KEY);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe(SECRET_KEY);
  });

  it('includes previousAttempts in the prompt so retries can ask for something shorter', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'Kurz' }] }));
    const provider = createAnthropicProvider({ apiKey: SECRET_KEY, fetchImpl });
    await provider.translate(
      baseRequest({
        previousAttempts: [{ text: 'Ein zu langer Text', measuredWidth: 400, clientWidth: 200 }],
      }),
    );

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { messages: Array<{ content: string }> };
    expect(body.messages[0].content).toContain('Ein zu langer Text');
    expect(body.messages[0].content).toContain('shorter');
  });

  it('raises a clear error on a non-OK response, without leaking the API key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 401 }));
    const provider = createAnthropicProvider({ apiKey: SECRET_KEY, fetchImpl });

    await expect(provider.translate(baseRequest())).rejects.toThrow(/401/);
    try {
      await provider.translate(baseRequest());
    } catch (error) {
      expect(String(error)).not.toContain(SECRET_KEY);
    }
  });

  it('raises a clear error when the response has no text content block', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ content: [] }));
    const provider = createAnthropicProvider({ apiKey: SECRET_KEY, fetchImpl });

    await expect(provider.translate(baseRequest())).rejects.toThrow(/no text content/);
  });

  it('falls back to ANTHROPIC_API_KEY and TRANSLATE_ROBOT_LLM_MODEL from the environment', async () => {
    process.env.ANTHROPIC_API_KEY = SECRET_KEY;
    process.env.TRANSLATE_ROBOT_LLM_MODEL = 'claude-custom-model';
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'Hallo' }] }));
    const provider = createAnthropicProvider({ fetchImpl });
    await provider.translate(baseRequest());

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { model: string };
    expect(body.model).toBe('claude-custom-model');
  });
});
