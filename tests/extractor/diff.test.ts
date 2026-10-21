import { describe, expect, it } from 'vitest';
import { diffI18nCatalogs } from '../../src/extractor/diff.js';

describe('diffI18nCatalogs', () => {
  it('returns empty for two empty catalogs', () => {
    expect(diffI18nCatalogs({}, {})).toEqual([]);
  });

  it('returns empty when nothing changed', () => {
    const catalog = { a: 'Hello', b: 'World' };
    expect(diffI18nCatalogs(catalog, { ...catalog })).toEqual([]);
  });

  it('includes a key added in the new catalog', () => {
    const result = diffI18nCatalogs({}, { greeting: 'Hello' });
    expect(result).toEqual([{ key: 'greeting', sourceText: 'Hello' }]);
  });

  it('includes a key whose value changed', () => {
    const result = diffI18nCatalogs({ greeting: 'Hi' }, { greeting: 'Hello' });
    expect(result).toEqual([{ key: 'greeting', sourceText: 'Hello' }]);
  });

  it('ignores a key removed in the new catalog', () => {
    const result = diffI18nCatalogs({ greeting: 'Hi', bye: 'Bye' }, { greeting: 'Hi' });
    expect(result).toEqual([]);
  });

  it('handles several simultaneous added/modified/removed keys, in new-catalog order', () => {
    const oldCatalog = { unchanged: 'same', modified: 'old value', removed: 'gone' };
    const newCatalog = { modified: 'new value', unchanged: 'same', added: 'fresh' };
    const result = diffI18nCatalogs(oldCatalog, newCatalog);
    expect(result).toEqual([
      { key: 'modified', sourceText: 'new value' },
      { key: 'added', sourceText: 'fresh' },
    ]);
  });

  it('treats an empty-string value as a real value, not a no-op', () => {
    const result = diffI18nCatalogs({ key: 'was something' }, { key: '' });
    expect(result).toEqual([{ key: 'key', sourceText: '' }]);
  });

  it('treats a trailing-whitespace-only difference as a modification', () => {
    const result = diffI18nCatalogs({ key: 'Hello' }, { key: 'Hello ' });
    expect(result).toEqual([{ key: 'key', sourceText: 'Hello ' }]);
  });

  it('adding a key to a previously-empty catalog', () => {
    const result = diffI18nCatalogs({}, { a: '1', b: '2' });
    expect(result).toEqual([
      { key: 'a', sourceText: '1' },
      { key: 'b', sourceText: '2' },
    ]);
  });

  it('removing every key results in an empty diff (never reports removals)', () => {
    const result = diffI18nCatalogs({ a: '1', b: '2' }, {});
    expect(result).toEqual([]);
  });
});
