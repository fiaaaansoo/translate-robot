import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFixtureProvider } from '../../src/translator/fixtureProvider.js';
import { baseRequest } from './testHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('createFixtureProvider (temp file)', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-provider-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('returns the recorded translation for a known key and locale', async () => {
    const recordedPath = path.join(dir, 'translations.recorded.json');
    fs.writeFileSync(recordedPath, JSON.stringify({ greeting: { de: 'Hallo' } }));
    const provider = createFixtureProvider(recordedPath);

    await expect(provider.translate(baseRequest())).resolves.toBe('Hallo');
  });

  it('throws a clear error for a key with no recorded translation at all', async () => {
    const recordedPath = path.join(dir, 'translations.recorded.json');
    fs.writeFileSync(recordedPath, JSON.stringify({}));
    const provider = createFixtureProvider(recordedPath);

    await expect(provider.translate(baseRequest())).rejects.toThrow(/greeting/);
  });

  it('throws a clear error when the key exists but not for the requested locale', async () => {
    const recordedPath = path.join(dir, 'translations.recorded.json');
    fs.writeFileSync(recordedPath, JSON.stringify({ greeting: { fr: 'Bonjour' } }));
    const provider = createFixtureProvider(recordedPath);

    await expect(provider.translate(baseRequest({ targetLocale: 'de' }))).rejects.toThrow(/de/);
  });

  it('throws a clear error on malformed JSON', () => {
    const recordedPath = path.join(dir, 'translations.recorded.json');
    fs.writeFileSync(recordedPath, '{ not json');
    expect(() => createFixtureProvider(recordedPath)).toThrow(/JSON/);
  });
});

describe('createFixtureProvider (real fixtures/toy-repo data)', () => {
  it('returns the real recorded en->de translation for expense_report_submit', async () => {
    const recordedPath = path.join(REPO_ROOT, 'fixtures', 'toy-repo', 'translations.recorded.json');
    const provider = createFixtureProvider(recordedPath);

    const result = await provider.translate(
      baseRequest({
        key: 'expense_report_submit',
        sourceText: 'Submit your monthly expense report',
      }),
    );
    expect(result).toBe('Spesenbericht einreichen');
  });
});
