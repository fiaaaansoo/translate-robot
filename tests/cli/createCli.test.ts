import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCli } from '../../src/cli/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

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

    const output = logSpy.mock.calls.map((call) => String(call[0])).join('\n');
    expect(output).toContain('expense_report_submit');
    expect(output).toContain('Spesenbericht einreichen');
    expect(output).toContain('resolved');
    expect(output).not.toContain('NOT RESOLVED');
    expect(errorSpy).not.toHaveBeenCalled();
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
});
