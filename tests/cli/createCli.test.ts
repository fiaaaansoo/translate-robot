import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCli } from '../../src/cli/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Joins every argument of every console call, not just the first - a secret
 * passed as a second argument (e.g. console.error('failed:', err)) would
 * otherwise go unnoticed by a check that only looks at call[0]. */
function joinCalls(calls: unknown[][]): string {
  return calls.map((args) => args.map(String).join(' ')).join('\n');
}

describe('createCli (real argv parsing, real toy-repo fixture, no network)', () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    if (previousKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = previousKey;
    }
  });

  it('runs --dry-run on the toy-repo fixture from argv alone, with zero secrets configured', async () => {
    const fixtureRoot = path.join(REPO_ROOT, 'fixtures', 'toy-repo');
    const program = createCli();

    await program.parseAsync(
      [
        'node',
        'translate-robot',
        'run',
        '--repo',
        fixtureRoot,
        '--new-i18n',
        path.join(fixtureRoot, 'i18n', 'en.json'),
        '--mapping',
        path.join(fixtureRoot, 'i18n-map.json'),
        '--recorded-translations',
        path.join(fixtureRoot, 'translations.recorded.json'),
        '--target-locale',
        'de',
        '--dry-run',
      ],
      { from: 'node' },
    );

    const output = joinCalls(logSpy.mock.calls as unknown[][]);
    expect(output).toContain('expense_report_submit');
    expect(output).toContain('Spesenbericht einreichen');
    expect(output).toContain('resolved');
    expect(output).not.toContain('NOT RESOLVED');
    expect(errorSpy).not.toHaveBeenCalled();
  }, 30_000);

  it('never prints the Anthropic API key, even once the real provider is constructed with it', async () => {
    const SECRET = 'sk-ant-cli-test-sentinel-do-not-leak';
    const fixtureRoot = path.join(REPO_ROOT, 'fixtures', 'toy-repo');
    process.env.ANTHROPIC_API_KEY = SECRET;

    try {
      const program = createCli();

      // No --recorded-translations, so runPipeline builds the real
      // createAnthropicProvider() (reading the key into memory) instead of
      // the fixture provider - the exact construction path the previous
      // version of this test never actually exercised. --old-i18n is the
      // same file as --new-i18n (zero diff), so extraction.changes is
      // empty and no translate() call - hence no real network request -
      // ever happens, while the real provider still got built with the
      // real key for the whole run.
      await program.parseAsync(
        [
          'node',
          'translate-robot',
          'run',
          '--repo',
          fixtureRoot,
          '--old-i18n',
          path.join(fixtureRoot, 'i18n', 'en.json'),
          '--new-i18n',
          path.join(fixtureRoot, 'i18n', 'en.json'),
          '--mapping',
          path.join(fixtureRoot, 'i18n-map.json'),
          '--target-locale',
          'de',
          '--dry-run',
        ],
        { from: 'node' },
      );

      const allOutput = joinCalls([...logSpy.mock.calls, ...errorSpy.mock.calls] as unknown[][]);
      expect(allOutput).not.toContain(SECRET);
    } finally {
      delete process.env.ANTHROPIC_API_KEY;
    }
  }, 30_000);

  it('rejects full mode without --owner/--repo-name, never attempting a real LLM or GitHub call', async () => {
    const fixtureRoot = path.join(REPO_ROOT, 'fixtures', 'toy-repo');
    const program = createCli();

    await expect(
      program.parseAsync(
        [
          'node',
          'translate-robot',
          'run',
          '--repo',
          fixtureRoot,
          '--new-i18n',
          path.join(fixtureRoot, 'i18n', 'en.json'),
          '--mapping',
          path.join(fixtureRoot, 'i18n-map.json'),
          '--recorded-translations',
          path.join(fixtureRoot, 'translations.recorded.json'),
          '--target-locale',
          'de',
        ],
        { from: 'node' },
      ),
    ).rejects.toThrow(/--owner/);
  }, 30_000);

  it('never prints the self-hosted LLM API key, even once the real openai-compatible provider is constructed with it', async () => {
    const SECRET = 'local-gateway-cli-test-sentinel-do-not-leak';
    const fixtureRoot = path.join(REPO_ROOT, 'fixtures', 'toy-repo');
    process.env.TRANSLATE_ROBOT_LLM_API_KEY = SECRET;

    try {
      const program = createCli();

      // Same zero-diff trick as the Anthropic secret test above: --old-i18n
      // equals --new-i18n, so extraction.changes is empty and translate()
      // never runs - no real network request - while the real provider
      // still gets constructed (and reads the key into memory) for the
      // whole run.
      await program.parseAsync(
        [
          'node',
          'translate-robot',
          'run',
          '--repo',
          fixtureRoot,
          '--old-i18n',
          path.join(fixtureRoot, 'i18n', 'en.json'),
          '--new-i18n',
          path.join(fixtureRoot, 'i18n', 'en.json'),
          '--mapping',
          path.join(fixtureRoot, 'i18n-map.json'),
          '--target-locale',
          'de',
          '--llm-provider',
          'openai-compatible',
          '--llm-base-url',
          'http://localhost:11434/v1',
          '--llm-model',
          'llama3',
          '--dry-run',
        ],
        { from: 'node' },
      );

      const allOutput = joinCalls([...logSpy.mock.calls, ...errorSpy.mock.calls] as unknown[][]);
      expect(allOutput).not.toContain(SECRET);
    } finally {
      delete process.env.TRANSLATE_ROBOT_LLM_API_KEY;
    }
  }, 30_000);
});
