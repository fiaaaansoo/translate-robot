import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenAiCompatibleProvider } from '../../src/translator/openAiCompatibleProvider.js';
import { baseRequest } from './testHelpers.js';
import { jsonResponse } from '../helpers.js';

const SECRET_KEY = 'local-gateway-super-secret-value-do-not-leak';
const BASE_URL = 'http://localhost:11434/v1';

function chatResponse(content: string) {
  return jsonResponse({ choices: [{ message: { content } }] });
}

describe('createOpenAiCompatibleProvider', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws if no baseUrl is configured', () => {
    expect(() => createOpenAiCompatibleProvider({ model: 'llama3' } as never)).toThrow(/baseUrl/);
  });

  it('throws if no model is configured', () => {
    expect(() => createOpenAiCompatibleProvider({ baseUrl: BASE_URL } as never)).toThrow(/model/);
  });

  it('returns the trimmed content of the first choice message', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse('  Hallo  '));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: BASE_URL,
      model: 'llama3',
      fetchImpl,
    });

    await expect(provider.translate(baseRequest())).resolves.toBe('Hallo');
  });

  it('posts to <baseUrl>/chat/completions, trimming a trailing slash on baseUrl', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse('Hallo'));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: 'http://localhost:11434/v1/',
      model: 'llama3',
      fetchImpl,
    });
    await provider.translate(baseRequest());

    const [url] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
  });

  it('sends the API key in the Authorization header, not in the URL or body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse('Hallo'));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: BASE_URL,
      model: 'llama3',
      apiKey: SECRET_KEY,
      fetchImpl,
    });
    await provider.translate(baseRequest());

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(SECRET_KEY);
    expect(String(init.body)).not.toContain(SECRET_KEY);
    const headers = init.headers as Record<string, string>;
    expect(headers['authorization']).toBe(`Bearer ${SECRET_KEY}`);
  });

  it('omits the Authorization header when no API key is configured (most self-hosted servers need none)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse('Hallo'));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: BASE_URL,
      model: 'llama3',
      fetchImpl,
    });
    await provider.translate(baseRequest());

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['authorization']).toBeUndefined();
  });

  it('includes previousAttempts in the prompt so retries can ask for something shorter', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse('Kurz'));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: BASE_URL,
      model: 'llama3',
      fetchImpl,
    });
    await provider.translate(
      baseRequest({
        previousAttempts: [{ text: 'Ein zu langer Text', measuredWidth: 400, clientWidth: 200 }],
      }),
    );

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { messages: Array<{ content: string }> };
    expect(body.messages[0]!.content).toContain('Ein zu langer Text');
    expect(body.messages[0]!.content).toContain('shorter');
  });

  it('sends the configured model in the request body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse('Hallo'));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: BASE_URL,
      model: 'llama3:70b',
      fetchImpl,
    });
    await provider.translate(baseRequest());

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { model: string };
    expect(body.model).toBe('llama3:70b');
  });

  it('raises a clear error on a non-OK response, without leaking the API key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: BASE_URL,
      model: 'llama3',
      apiKey: SECRET_KEY,
      fetchImpl,
    });

    await expect(provider.translate(baseRequest())).rejects.toThrow(/500/);
    try {
      await provider.translate(baseRequest());
    } catch (error) {
      expect(String(error)).not.toContain(SECRET_KEY);
    }
  });

  it('raises a clear error when the response has no choices/message content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ choices: [] }));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: BASE_URL,
      model: 'llama3',
      fetchImpl,
    });

    await expect(provider.translate(baseRequest())).rejects.toThrow(/no message content/);
  });

  it('falls back to TRANSLATE_ROBOT_LLM_API_KEY from the environment when apiKey is not passed', async () => {
    process.env.TRANSLATE_ROBOT_LLM_API_KEY = SECRET_KEY;
    const fetchImpl = vi.fn().mockResolvedValue(chatResponse('Hallo'));
    const provider = createOpenAiCompatibleProvider({
      baseUrl: BASE_URL,
      model: 'llama3',
      fetchImpl,
    });
    await provider.translate(baseRequest());

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['authorization']).toBe(`Bearer ${SECRET_KEY}`);
  });
});
