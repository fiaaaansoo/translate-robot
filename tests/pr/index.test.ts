import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { openTranslationPr } from '../../src/pr/index.js';
import type { OpenTranslationPrOptions, PrChangeSummary } from '../../src/pr/index.js';
import type { GitClient } from '../../src/pr/git.js';
import type { GitHubClient, OpenPullRequestParams } from '../../src/pr/github.js';
import type { ExtractedChange, TranslationResult } from '../../src/types.js';

function createRecordingGitClient(
  options: { committed?: boolean } = {},
): GitClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async createBranch(branchName, baseBranch) {
      calls.push(`createBranch(${branchName}, ${baseBranch})`);
    },
    async commitAll(message) {
      calls.push(`commitAll(${message})`);
      return options.committed ?? true;
    },
    async push(branchName) {
      calls.push(`push(${branchName})`);
    },
  };
}

function createRecordingGitHubClient(): GitHubClient & { requests: OpenPullRequestParams[] } {
  const requests: OpenPullRequestParams[] = [];
  return {
    requests,
    async openPullRequest(params) {
      requests.push(params);
      return { url: 'https://github.com/acme/app/pull/1' };
    },
  };
}

function change(overrides: Partial<ExtractedChange> = {}): ExtractedChange {
  return {
    key: 'greeting',
    sourceText: 'Hello',
    componentPath: '/repo/src/components/Greeting.tsx',
    measureTarget: '#greeting',
    ...overrides,
  };
}

function result(overrides: Partial<TranslationResult> = {}): TranslationResult {
  return {
    key: 'greeting',
    translatedText: 'Hallo',
    measuredWidth: 80,
    iterations: 1,
    resolved: true,
    ...overrides,
  };
}

describe('openTranslationPr', () => {
  let repoRoot: string;
  let i18nTargetPath: string;
  let git: GitClient & { calls: string[] };
  let github: GitHubClient & { requests: OpenPullRequestParams[] };

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-index-test-'));
    i18nTargetPath = path.join(repoRoot, 'de.json');
    git = createRecordingGitClient();
    github = createRecordingGitHubClient();
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  function open(summaries: PrChangeSummary[], overrides: Partial<OpenTranslationPrOptions> = {}) {
    return openTranslationPr(summaries, 'de', {
      repoRoot,
      i18nTargetPath,
      baseBranch: 'main',
      branchName: 'i18n-de',
      owner: 'acme',
      repo: 'app',
      git,
      github,
      ...overrides,
    });
  }

  it('writes the merged translations to the target file', async () => {
    fs.writeFileSync(i18nTargetPath, JSON.stringify({ farewell: 'Auf Wiedersehen' }));

    await open([{ change: change(), result: result() }]);

    expect(JSON.parse(fs.readFileSync(i18nTargetPath, 'utf-8'))).toEqual({
      farewell: 'Auf Wiedersehen',
      greeting: 'Hallo',
    });
  });

  it('creates the branch, commits, and pushes in order before opening the PR', async () => {
    await open([{ change: change(), result: result() }]);

    expect(git.calls).toEqual([
      'createBranch(i18n-de, main)',
      'commitAll(i18n(de): translate 1 key(s))',
      'push(i18n-de)',
    ]);
    expect(github.requests).toHaveLength(1);
  });

  it('opens the PR with owner/repo/head/base and returns its URL', async () => {
    const outcome = await open([{ change: change(), result: result() }]);

    expect(outcome?.url).toBe('https://github.com/acme/app/pull/1');
    expect(github.requests[0]).toMatchObject({
      owner: 'acme',
      repo: 'app',
      head: 'i18n-de',
      base: 'main',
    });
  });

  it('includes the key, measured width, iteration count, and component path in the PR body', async () => {
    await open([{ change: change(), result: result({ measuredWidth: 123, iterations: 2 }) }]);

    const body = github.requests[0].body;
    expect(body).toContain('greeting');
    expect(body).toContain('123px');
    expect(body).toContain('2 attempt(s)');
    expect(body).toContain('/repo/src/components/Greeting.tsx');
  });

  it('flags an unresolved key clearly in the PR body instead of hiding it', async () => {
    await open([{ change: change(), result: result({ resolved: false }) }]);

    expect(github.requests[0].body).toContain('NOT RESOLVED');
  });

  it('returns null and never pushes or opens a PR when there is nothing to commit', async () => {
    git = createRecordingGitClient({ committed: false });

    const outcome = await open([{ change: change(), result: result() }]);

    expect(outcome).toBeNull();
    expect(git.calls).toEqual([
      'createBranch(i18n-de, main)',
      'commitAll(i18n(de): translate 1 key(s))',
    ]);
    expect(github.requests).toHaveLength(0);
  });

  it('creates the branch before writing the translated file, so a branch failure leaves the working tree untouched', async () => {
    git = {
      async createBranch() {
        throw new Error('simulated branch-creation failure');
      },
      async commitAll() {
        return true;
      },
      async push() {},
    };

    await expect(open([{ change: change(), result: result() }])).rejects.toThrow(
      'simulated branch-creation failure',
    );

    expect(fs.existsSync(i18nTargetPath)).toBe(false);
  });
});
