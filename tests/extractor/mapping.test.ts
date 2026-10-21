import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { resolveContext, parseMapping } from '../../src/extractor/mapping.js';
import type { I18nMapping } from '../../src/types.js';

describe('resolveContext', () => {
  let dir: string;
  let mappingPath: string;
  let mapping: I18nMapping;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-context-test-'));
    mappingPath = path.join(dir, 'i18n-map.json');
    // Real file on disk: resolveContext checks existence against the
    // filesystem, same convention as the rest of this module's tests
    // (tests/extractor/index.test.ts) rather than an injected fake.
    fs.writeFileSync(path.join(dir, 'hero.html'), '<h1 id="hero-title">placeholder</h1>');
    mapping = { greeting: { component: 'hero.html', selector: '#hero-title' } };
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('resolves a diff entry that has a mapping entry', () => {
    const result = resolveContext([{ key: 'greeting', sourceText: 'Hello' }], mapping, mappingPath);
    expect(result.errors).toEqual([]);
    expect(result.changes).toEqual([
      {
        key: 'greeting',
        sourceText: 'Hello',
        componentPath: path.join(dir, 'hero.html'),
        measureTarget: '#hero-title',
      },
    ]);
  });

  it('reports an explicit error for a key with no mapping entry, without throwing', () => {
    const result = resolveContext(
      [{ key: 'unmapped_key', sourceText: 'Hi' }],
      mapping,
      mappingPath,
    );
    expect(result.changes).toEqual([]);
    expect(result.errors).toEqual([
      { key: 'unmapped_key', reason: expect.stringContaining('aucune entrée') },
    ]);
  });

  it('processes every other key when only one is unmapped (partial success)', () => {
    const result = resolveContext(
      [
        { key: 'greeting', sourceText: 'Hello' },
        { key: 'unmapped_key', sourceText: 'Hi' },
      ],
      mapping,
      mappingPath,
    );
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]?.key).toBe('greeting');
    expect(result.errors).toEqual([
      { key: 'unmapped_key', reason: expect.stringContaining('aucune entrée') },
    ]);
  });

  it("reports an explicit error when the mapped component file doesn't exist on disk", () => {
    const mappingWithMissingComponent: I18nMapping = {
      greeting: { component: 'does-not-exist.html', selector: '#hero-title' },
    };
    const result = resolveContext(
      [{ key: 'greeting', sourceText: 'Hello' }],
      mappingWithMissingComponent,
      mappingPath,
    );
    expect(result.changes).toEqual([]);
    expect(result.errors).toEqual([
      { key: 'greeting', reason: expect.stringContaining('introuvable') },
    ]);
  });

  it('returns no changes and no errors for an empty diff', () => {
    const result = resolveContext([], mapping, mappingPath);
    expect(result).toEqual({ changes: [], errors: [] });
  });
});

describe('parseMapping', () => {
  it('parses a well-formed mapping object', () => {
    const raw = JSON.stringify({
      greeting: { component: 'component/hero.html', selector: '#hero-title' },
    });
    expect(parseMapping(raw)).toEqual({
      greeting: { component: 'component/hero.html', selector: '#hero-title' },
    });
  });

  it('accepts an empty mapping object', () => {
    expect(parseMapping('{}')).toEqual({});
  });

  it('throws a clear error on malformed JSON', () => {
    expect(() => parseMapping('{ not json')).toThrow(/JSON/);
  });

  it('throws a clear error when the top level is not an object', () => {
    expect(() => parseMapping('[1,2,3]')).toThrow(/objet/);
  });

  it("throws naming the bad key when an entry is missing 'component'", () => {
    const raw = JSON.stringify({ greeting: { selector: '#hero-title' } });
    expect(() => parseMapping(raw)).toThrow(/greeting/);
  });

  it("throws naming the bad key when an entry is missing 'selector'", () => {
    const raw = JSON.stringify({ greeting: { component: 'component/hero.html' } });
    expect(() => parseMapping(raw)).toThrow(/greeting/);
  });

  it('throws when component is not a string', () => {
    const raw = JSON.stringify({ greeting: { component: 42, selector: '#x' } });
    expect(() => parseMapping(raw)).toThrow(/greeting/);
  });

  it('throws when selector is not a string', () => {
    const raw = JSON.stringify({ greeting: { component: 'c.html', selector: null } });
    expect(() => parseMapping(raw)).toThrow(/greeting/);
  });
});
