import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { openTranslationPr } from '../../src/pr/index.js';
import type { PrChangeSummary } from '../../src/pr/index.js';
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

  beforeEach(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-index-test-'));
    i18nTargetPath = path.join(repoRoot, 'de.json');
  });

  afterEach(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes the merged translations to the target file', async () => {
    fs.writeFileSync(i18nTargetPath, JSON.stringify({ farewell: 'Auf Wiedersehen' }));
    const git = createRecordingGitClient();
    const github = createRecordingGitHubClient();
    const summaries: PrChangeSummary[] = [{ change: change(), result: result() }];

    await openTranslationPr(summaries, 'de', {
      repoRoot,
      i18nTargetPath,
      baseBranch: 'main',
      branchName: 'i18n-de',
      owner: 'acme',
      repo: 'app',
      git,
      github,
    });

    expect(JSON.parse(fs.readFileSync(i18nTargetPath, 'utf-8'))).toEqual({
      farewell: 'Auf Wiedersehen',
      greeting: 'Hallo',
    });
  });

  it('creates the branch, commits, and pushes in order before opening the PR', async () => {
    const git = createRecordingGitClient();
    const github = createRecordingGitHubClient();
    const summaries: PrChangeSummary[] = [{ change: change(), result: result() }];

    await openTranslationPr(summaries, 'de', {
      repoRoot,
      i18nTargetPath,
      baseBranch: 'main',
      branchName: 'i18n-de',
      owner: 'acme',
      repo: 'app',
      git,
      github,
    });

    expect(git.calls).toEqual([
      'createBranch(i18n-de, main)',
      'commitAll(i18n(de): translate 1 key(s))',
      'push(i18n-de)',
    ]);
    expect(github.requests).toHaveLength(1);
  });

  it('opens the PR with owner/repo/head/base and returns its URL', async () => {
    const git = createRecordingGitClient();
    const github = createRecordingGitHubClient();
    const summaries: PrChangeSummary[] = [{ change: change(), result: result() }];

    const outcome = await openTranslationPr(summaries, 'de', {
      repoRoot,
      i18nTargetPath,
      baseBranch: 'main',
      branchName: 'i18n-de',
      owner: 'acme',
      repo: 'app',
      git,
      github,
    });

    expect(outcome?.url).toBe('https://github.com/acme/app/pull/1');
    expect(github.requests[0]).toMatchObject({
      owner: 'acme',
      repo: 'app',
      head: 'i18n-de',
      base: 'main',
    });
  });

  it('includes the key, measured width, iteration count, and component path in the PR body', async () => {
    const git = createRecordingGitClient();
    const github = createRecordingGitHubClient();
    const summaries: PrChangeSummary[] = [
      { change: change(), result: result({ measuredWidth: 123, iterations: 2 }) },
    ];

    await openTranslationPr(summaries, 'de', {
      repoRoot,
      i18nTargetPath,
      baseBranch: 'main',
      branchName: 'i18n-de',
      owner: 'acme',
      repo: 'app',
      git,
      github,
    });

    const body = github.requests[0].body;
    expect(body).toContain('greeting');
    expect(body).toContain('123px');
    expect(body).toContain('2 attempt(s)');
    expect(body).toContain('/repo/src/components/Greeting.tsx');
  });

  it('flags an unresolved key clearly in the PR body instead of hiding it', async () => {
    const git = createRecordingGitClient();
    const github = createRecordingGitHubClient();
    const summaries: PrChangeSummary[] = [
      { change: change(), result: result({ resolved: false }) },
    ];

    await openTranslationPr(summaries, 'de', {
      repoRoot,
      i18nTargetPath,
      baseBranch: 'main',
      branchName: 'i18n-de',
      owner: 'acme',
      repo: 'app',
      git,
      github,
    });

    expect(github.requests[0].body).toContain('NOT RESOLVED');
  });

  it('never calls merge or approve anywhere in its own flow', async () => {
    const git = createRecordingGitClient();
    const github = createRecordingGitHubClient();
    const summaries: PrChangeSummary[] = [{ change: change(), result: result() }];

    await openTranslationPr(summaries, 'de', {
      repoRoot,
      i18nTargetPath,
      baseBranch: 'main',
      branchName: 'i18n-de',
      owner: 'acme',
      repo: 'app',
      git,
      github,
    });

    expect(git.calls.join(' ')).not.toMatch(/merge|approve/i);
  });

  it('returns null and never pushes or opens a PR when there is nothing to commit', async () => {
    const git = createRecordingGitClient({ committed: false });
    const github = createRecordingGitHubClient();
    const summaries: PrChangeSummary[] = [{ change: change(), result: result() }];

    const outcome = await openTranslationPr(summaries, 'de', {
      repoRoot,
      i18nTargetPath,
      baseBranch: 'main',
      branchName: 'i18n-de',
      owner: 'acme',
      repo: 'app',
      git,
      github,
    });

    expect(outcome).toBeNull();
    expect(git.calls).toEqual([
      'createBranch(i18n-de, main)',
      'commitAll(i18n(de): translate 1 key(s))',
    ]);
    expect(github.requests).toHaveLength(0);
  });

  it('creates the branch before writing the translated file, so a branch failure leaves the working tree untouched', async () => {
    const git: GitClient = {
      async createBranch() {
        throw new Error('simulated branch-creation failure');
      },
      async commitAll() {
        return true;
      },
      async push() {},
    };
    const github = createRecordingGitHubClient();
    const summaries: PrChangeSummary[] = [{ change: change(), result: result() }];

    await expect(
      openTranslationPr(summaries, 'de', {
        repoRoot,
        i18nTargetPath,
        baseBranch: 'main',
        branchName: 'i18n-de',
        owner: 'acme',
        repo: 'app',
        git,
        github,
      }),
    ).rejects.toThrow('simulated branch-creation failure');

    expect(fs.existsSync(i18nTargetPath)).toBe(false);
  });
});
