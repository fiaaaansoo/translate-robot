import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractChangesFromFiles } from '../../src/extractor/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('extractChangesFromFiles (unit, temp files)', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'extractor-test-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function write(name: string, content: unknown) {
    const p = path.join(dir, name);
    fs.writeFileSync(p, typeof content === 'string' ? content : JSON.stringify(content));
    return p;
  }

  it('resolves an added key end to end', () => {
    write('component.html', '<button id="x">placeholder</button>');
    const oldPath = write('old.json', {});
    const newPath = write('new.json', { greeting: 'Hello' });
    const mappingPath = write('map.json', {
      greeting: { component: 'component.html', selector: '#x' },
    });

    const result = extractChangesFromFiles({
      oldI18nPath: oldPath,
      newI18nPath: newPath,
      mappingPath,
    });

    expect(result.errors).toEqual([]);
    expect(result.changes).toEqual([
      {
        key: 'greeting',
        sourceText: 'Hello',
        componentPath: path.join(dir, 'component.html'),
        measureTarget: '#x',
      },
    ]);
  });

  it('treats a missing old-i18n file as an empty catalog (first-ever add)', () => {
    write('component.html', '<button id="x">placeholder</button>');
    const missingOldPath = path.join(dir, 'does-not-exist.json');
    const newPath = write('new.json', { greeting: 'Hello' });
    const mappingPath = write('map.json', {
      greeting: { component: 'component.html', selector: '#x' },
    });

    const result = extractChangesFromFiles({
      oldI18nPath: missingOldPath,
      newI18nPath: newPath,
      mappingPath,
    });

    expect(result.errors).toEqual([]);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.key).toBe('greeting');
  });

  it('throws a clear error when the new-i18n file is missing', () => {
    const oldPath = write('old.json', {});
    const missingNewPath = path.join(dir, 'does-not-exist.json');
    const mappingPath = write('map.json', {});

    expect(() =>
      extractChangesFromFiles({ oldI18nPath: oldPath, newI18nPath: missingNewPath, mappingPath }),
    ).toThrow(/does-not-exist\.json/);
  });

  it('throws a clear error when the mapping file is missing', () => {
    const oldPath = write('old.json', {});
    const newPath = write('new.json', { greeting: 'Hello' });
    const missingMappingPath = path.join(dir, 'does-not-exist.json');

    expect(() =>
      extractChangesFromFiles({
        oldI18nPath: oldPath,
        newI18nPath: newPath,
        mappingPath: missingMappingPath,
      }),
    ).toThrow(/does-not-exist\.json/);
  });
});

describe('extractChangesFromFiles (integration, real fixtures/toy-repo)', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'extractor-integration-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('resolves expense_report_submit from the real toy-repo fixture', () => {
    const fixtureRoot = path.join(REPO_ROOT, 'fixtures', 'toy-repo');
    const newI18nPath = path.join(fixtureRoot, 'i18n', 'en.json');
    const mappingPath = path.join(fixtureRoot, 'i18n-map.json');
    // Synthesize the "before" state as empty: the fixture only ships the
    // current (post-change) en.json, and this task's job is diffing two
    // snapshots, not producing them — the real old snapshot comes from git
    // in production (task 07's concern), not from this extractor.
    const oldI18nPath = path.join(dir, 'empty-old.json');
    fs.writeFileSync(oldI18nPath, '{}');

    const result = extractChangesFromFiles({ oldI18nPath, newI18nPath, mappingPath });

    expect(result.errors).toEqual([]);
    expect(result.changes).toEqual([
      {
        key: 'expense_report_submit',
        sourceText: 'Submit your monthly expense report',
        componentPath: path.join(fixtureRoot, 'component', 'button.html'),
        measureTarget: '#expense-report-submit',
      },
    ]);
  });
});
