import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGitHubClient } from '../../src/pr/github.js';
import type { OpenPullRequestParams } from '../../src/pr/github.js';

function baseParams(overrides: Partial<OpenPullRequestParams> = {}): OpenPullRequestParams {
  return {
    owner: 'acme',
    repo: 'app',
    title: 'i18n(de): translate greeting',
    body: 'Automated translation PR.',
    head: 'i18n-de',
    base: 'main',
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 201): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const SECRET_TOKEN = 'ghp_super_secret_value_do_not_leak';

describe('createGitHubClient', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws if no token is configured anywhere', () => {
    delete process.env.GITHUB_TOKEN;
    expect(() => createGitHubClient()).toThrow(/token/);
  });

  it('opens a pull request and returns its URL', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ html_url: 'https://github.com/acme/app/pull/42' }));
    const client = createGitHubClient({ token: SECRET_TOKEN, fetchImpl });

    const result = await client.openPullRequest(baseParams());

    expect(result.url).toBe('https://github.com/acme/app/pull/42');
  });

  it('sends the token in the Authorization header, not in the URL or body', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ html_url: 'https://github.com/acme/app/pull/42' }));
    const client = createGitHubClient({ token: SECRET_TOKEN, fetchImpl });
    await client.openPullRequest(baseParams());

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/acme/app/pulls');
    expect(url).not.toContain(SECRET_TOKEN);
    expect(String(init.body)).not.toContain(SECRET_TOKEN);
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${SECRET_TOKEN}`);
  });

  it('sends title/body/head/base from the request params', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ html_url: 'https://github.com/acme/app/pull/42' }));
    const client = createGitHubClient({ token: SECRET_TOKEN, fetchImpl });
    await client.openPullRequest(
      baseParams({ title: 'My title', body: 'My body', head: 'feat', base: 'develop' }),
    );

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body).toEqual({ title: 'My title', body: 'My body', head: 'feat', base: 'develop' });
  });

  it('raises a clear error on a non-OK response, without leaking the token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 403 }));
    const client = createGitHubClient({ token: SECRET_TOKEN, fetchImpl });

    await expect(client.openPullRequest(baseParams())).rejects.toThrow(/403/);
    try {
      await client.openPullRequest(baseParams());
    } catch (error) {
      expect(String(error)).not.toContain(SECRET_TOKEN);
    }
  });

  it('raises a clear error when the response has no html_url', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));
    const client = createGitHubClient({ token: SECRET_TOKEN, fetchImpl });

    await expect(client.openPullRequest(baseParams())).rejects.toThrow(/html_url/);
  });

  it('falls back to GITHUB_TOKEN from the environment', async () => {
    process.env.GITHUB_TOKEN = SECRET_TOKEN;
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ html_url: 'https://github.com/acme/app/pull/42' }));
    const client = createGitHubClient({ fetchImpl });
    await client.openPullRequest(baseParams());

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${SECRET_TOKEN}`);
  });
});
