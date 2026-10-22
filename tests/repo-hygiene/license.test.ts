import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('LICENSE', () => {
  it('exists at the repo root and is the Apache License, Version 2.0', () => {
    const licensePath = path.join(REPO_ROOT, 'LICENSE');
    expect(fs.existsSync(licensePath)).toBe(true);
    const text = fs.readFileSync(licensePath, 'utf-8');
    expect(text).toContain('Apache License');
    expect(text).toContain('Version 2.0');
    expect(text).toMatch(/Copyright \d{4} \S+/);
  });

  it("matches package.json's declared license field", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8')) as {
      license: string;
    };
    expect(pkg.license).toBe('Apache-2.0');
  });
});
