import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('CODE_OF_CONDUCT.md', () => {
  it('exists at the repo root and is the Contributor Covenant, version 2.1', () => {
    const p = path.join(REPO_ROOT, 'CODE_OF_CONDUCT.md');
    expect(fs.existsSync(p)).toBe(true);
    const text = fs.readFileSync(p, 'utf-8');
    expect(text).toContain('Contributor Covenant');
    expect(text).toContain('version 2.1');
  });

  it('names a real reporting channel, not an unresolved placeholder', () => {
    const text = fs.readFileSync(path.join(REPO_ROOT, 'CODE_OF_CONDUCT.md'), 'utf-8');
    expect(text).not.toMatch(/\[INSERT [^\]]*\]/i);
    expect(text).toContain('github.com/fiaaaansoo/translate-robot');
  });

  it('is linked from CONTRIBUTING.md', () => {
    const contributing = fs.readFileSync(path.join(REPO_ROOT, 'CONTRIBUTING.md'), 'utf-8');
    expect(contributing).toContain('CODE_OF_CONDUCT.md');
  });
});
