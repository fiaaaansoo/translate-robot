import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPipeline } from '../../src/cli/index.js';
import type { GitClient } from '../../src/pr/git.js';
import type { GitHubClient, OpenPullRequestParams } from '../../src/pr/github.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function createRecordingGitClient(): GitClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async createBranch(branchName, baseBranch) {
      calls.push(`createBranch(${branchName}, ${baseBranch})`);
    },
    async commitAll(message) {
      calls.push(`commitAll(${message})`);
      return true;
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

describe('runPipeline (unit, temp fixture, fake git/github)', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-pipeline-test-'));
    fs.writeFileSync(
      path.join(dir, 'component.html'),
      '<!doctype html><html><body><div id="x" style="display:inline-block;width:300px;white-space:nowrap;">placeholder</div></body></html>',
    );
    fs.writeFileSync(path.join(dir, 'new.json'), JSON.stringify({ greeting: 'Hello' }));
    fs.writeFileSync(
      path.join(dir, 'map.json'),
      JSON.stringify({ greeting: { component: 'component.html', selector: '#x' } }),
    );
    fs.writeFileSync(
      path.join(dir, 'recorded.json'),
      JSON.stringify({ greeting: { de: 'Hallo' } }),
    );
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function baseOptions() {
    return {
      repo: dir,
      newI18n: path.join(dir, 'new.json'),
      mapping: path.join(dir, 'map.json'),
      i18nTarget: path.join(dir, 'de.json'),
      targetLocale: 'de',
      recordedTranslations: path.join(dir, 'recorded.json'),
      baseBranch: 'main',
      branchName: 'i18n-de',
      maxAttempts: 3,
    };
  }

  it('dry-run: translates and measures but writes nothing and opens no PR', async () => {
    const outcome = await runPipeline({ ...baseOptions(), dryRun: true });

    expect(outcome.errors).toEqual([]);
    expect(outcome.results).toEqual([
      {
        key: 'greeting',
        translatedText: 'Hallo',
        measuredWidth: expect.any(Number),
        iterations: 1,
        resolved: true,
      },
    ]);
    expect(outcome.pr).toBeNull();
    expect(fs.existsSync(path.join(dir, 'de.json'))).toBe(false);
  }, 30_000);

  it('full mode: opens a PR via the injected git/github clients', async () => {
    const git = createRecordingGitClient();
    const github = createRecordingGitHubClient();

    const outcome = await runPipeline({
      ...baseOptions(),
      dryRun: false,
      owner: 'acme',
      repoName: 'app',
      git,
      github,
    });

    expect(outcome.pr?.url).toBe('https://github.com/acme/app/pull/1');
    expect(git.calls).toEqual([
      'createBranch(i18n-de, main)',
      'commitAll(i18n(de): translate 1 key(s))',
      'push(i18n-de)',
    ]);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'de.json'), 'utf-8'))).toEqual({
      greeting: 'Hallo',
    });
  }, 30_000);

  it('full mode: throws a clear error when --owner/--repo-name are missing', async () => {
    await expect(runPipeline({ ...baseOptions(), dryRun: false })).rejects.toThrow(/--owner/);
  }, 30_000);

  it('surfaces extraction errors without blocking keys that did resolve', async () => {
    fs.writeFileSync(
      path.join(dir, 'new.json'),
      JSON.stringify({ greeting: 'Hello', farewell: 'Bye' }),
    );
    fs.writeFileSync(
      path.join(dir, 'map.json'),
      JSON.stringify({ greeting: { component: 'component.html', selector: '#x' } }),
    );
    fs.writeFileSync(
      path.join(dir, 'recorded.json'),
      JSON.stringify({ greeting: { de: 'Hallo' }, farewell: { de: 'Auf Wiedersehen' } }),
    );

    const outcome = await runPipeline({ ...baseOptions(), dryRun: true });

    expect(outcome.errors).toHaveLength(1);
    expect(outcome.errors[0]?.key).toBe('farewell');
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]?.key).toBe('greeting');
  }, 30_000);

  it('treats an omitted --old-i18n as a first-ever add', async () => {
    const outcome = await runPipeline({ ...baseOptions(), dryRun: true });

    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]!.key).toBe('greeting');
  }, 30_000);

  it('--dry-run still attempts a real translation (not just skips it) when no --recorded-translations is given', async () => {
    const previousKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const { recordedTranslations, ...optionsWithoutFixtureProvider } = baseOptions();
    void recordedTranslations;

    try {
      // Only --dry-run (write/PR) is ever skipped; translation itself is not -
      // so without a recorded-translations fixture, this must still reach the
      // real Anthropic provider and fail on the missing API key, exactly as
      // it would outside --dry-run.
      await expect(runPipeline({ ...optionsWithoutFixtureProvider, dryRun: true })).rejects.toThrow(
        /API key/,
      );
    } finally {
      if (previousKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = previousKey;
      }
    }
  }, 30_000);
});

describe('runPipeline (end to end, real fixtures/toy-repo, no network)', () => {
  it('translates the real toy-repo fixture with zero secrets configured', async () => {
    const fixtureRoot = path.join(REPO_ROOT, 'fixtures', 'toy-repo');
    const previousKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    try {
      const outcome = await runPipeline({
        repo: fixtureRoot,
        newI18n: path.join(fixtureRoot, 'i18n', 'en.json'),
        mapping: path.join(fixtureRoot, 'i18n-map.json'),
        i18nTarget: path.join(fixtureRoot, 'i18n', 'de.json'),
        targetLocale: 'de',
        dryRun: true,
        recordedTranslations: path.join(fixtureRoot, 'translations.recorded.json'),
        baseBranch: 'main',
        branchName: 'i18n-de',
        maxAttempts: 3,
      });

      expect(outcome.errors).toEqual([]);
      expect(outcome.results).toEqual([
        {
          key: 'expense_report_submit',
          translatedText: 'Spesenbericht einreichen',
          measuredWidth: expect.any(Number),
          iterations: 1,
          resolved: true,
        },
      ]);
    } finally {
      if (previousKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = previousKey;
      }
    }
  }, 30_000);
});
