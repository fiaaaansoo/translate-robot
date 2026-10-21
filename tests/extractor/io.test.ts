import { describe, expect, it } from 'vitest';
import { parseI18nCatalog } from '../../src/extractor/io.js';

describe('parseI18nCatalog', () => {
  it('parses a valid flat catalog', () => {
    const raw = JSON.stringify({ a: 'Hello', b: 'World' });
    expect(parseI18nCatalog(raw)).toEqual({ a: 'Hello', b: 'World' });
  });

  it('accepts an empty catalog', () => {
    expect(parseI18nCatalog('{}')).toEqual({});
  });

  it('throws a clear error on malformed JSON', () => {
    expect(() => parseI18nCatalog('{ not json')).toThrow(/JSON/);
  });

  it('throws when the top level is an array, not a flat object', () => {
    expect(() => parseI18nCatalog('["a", "b"]')).toThrow(/plat/);
  });

  it('throws when the top level is a primitive', () => {
    expect(() => parseI18nCatalog('"just a string"')).toThrow(/plat/);
  });

  it('throws naming the key when a value is nested (not flat, no ICU plurals in v1)', () => {
    const raw = JSON.stringify({ greeting: { one: 'Hi', other: 'Hello' } });
    expect(() => parseI18nCatalog(raw)).toThrow(/greeting/);
  });

  it('throws naming the key when a value is a number', () => {
    const raw = JSON.stringify({ count: 42 });
    expect(() => parseI18nCatalog(raw)).toThrow(/count/);
  });

  it('throws naming the key when a value is null', () => {
    const raw = JSON.stringify({ greeting: null });
    expect(() => parseI18nCatalog(raw)).toThrow(/greeting/);
  });
});
