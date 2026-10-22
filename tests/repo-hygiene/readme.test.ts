import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('README.md (English, canonical)', () => {
  const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf-8');

  it('cross-links to the French README as its very first line', () => {
    expect(readme.split('\n')[0]).toContain('README.fr.md');
  });

  it('embeds both before/after screenshots', () => {
    expect(readme).toContain('docs/images/before-overflow.png');
    expect(readme).toContain('docs/images/after-fit.png');
  });

  it('states the never-auto-merges safety invariant', () => {
    expect(readme).toMatch(/never\s+merges\s+or\s+approves/i);
  });

  it('carries the AI-generated-translation disclaimer', () => {
    expect(readme).toMatch(/LLM output/i);
  });

  it('documents the minimal GitHub Action permissions', () => {
    expect(readme).toContain('contents: write');
    expect(readme).toContain('pull-requests: write');
  });

  it('references the real CI workflow path for its badge', () => {
    expect(readme).toContain('actions/workflows/ci.yml');
  });
});

describe('README.fr.md (French)', () => {
  const readme = fs.readFileSync(path.join(REPO_ROOT, 'README.fr.md'), 'utf-8');

  it('cross-links to the English README as its very first line', () => {
    expect(readme.split('\n')[0]).toContain('README.md');
  });

  it('embeds both before/after screenshots', () => {
    expect(readme).toContain('docs/images/before-overflow.png');
    expect(readme).toContain('docs/images/after-fit.png');
  });
});

describe('docs/images/', () => {
  it('contains both real screenshots, generated from the toy-repo fixture', () => {
    const beforePath = path.join(REPO_ROOT, 'docs', 'images', 'before-overflow.png');
    const afterPath = path.join(REPO_ROOT, 'docs', 'images', 'after-fit.png');
    expect(fs.existsSync(beforePath)).toBe(true);
    expect(fs.existsSync(afterPath)).toBe(true);
    // A real PNG screenshot is comfortably larger than a few hundred bytes;
    // guards against an accidentally-empty or placeholder file being committed.
    expect(fs.statSync(beforePath).size).toBeGreaterThan(5_000);
    expect(fs.statSync(afterPath).size).toBeGreaterThan(5_000);
  });
});
