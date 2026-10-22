import { describe, expect, it } from 'vitest';
import { mergeTranslations } from '../../src/pr/i18nFile.js';

describe('mergeTranslations', () => {
  it('creates a new catalog when the target file does not exist yet', () => {
    const result = mergeTranslations(undefined, 'de.json', { greeting: 'Hallo' });
    expect(JSON.parse(result)).toEqual({ greeting: 'Hallo' });
  });

  it('preserves existing keys that are not part of this update', () => {
    const existing = JSON.stringify({ greeting: 'Hallo', farewell: 'Auf Wiedersehen' });
    const result = mergeTranslations(existing, 'de.json', { greeting: 'Servus' });

    expect(JSON.parse(result)).toEqual({ greeting: 'Servus', farewell: 'Auf Wiedersehen' });
  });

  it('adds new keys alongside existing ones without touching them', () => {
    const existing = JSON.stringify({ farewell: 'Auf Wiedersehen' });
    const result = mergeTranslations(existing, 'de.json', { greeting: 'Hallo' });

    expect(JSON.parse(result)).toEqual({ farewell: 'Auf Wiedersehen', greeting: 'Hallo' });
  });

  it('writes 2-space indented JSON with a trailing newline', () => {
    const result = mergeTranslations(undefined, 'de.json', { greeting: 'Hallo' });
    expect(result).toBe('{\n  "greeting": "Hallo"\n}\n');
  });

  it('throws a clear error naming the target path when the existing file is malformed JSON', () => {
    expect(() => mergeTranslations('{ not json', 'de.json', { greeting: 'Hallo' })).toThrow(
      /de\.json/,
    );
  });

  it('throws a clear error naming the key when an existing value is not a string', () => {
    const existing = JSON.stringify({ greeting: 42 });
    expect(() => mergeTranslations(existing, 'de.json', { farewell: 'Auf Wiedersehen' })).toThrow(
      /greeting/,
    );
  });
});
