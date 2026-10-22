import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Matches an actual call/definition shape (merge(...), approve(...)) or an
// explicit auto-merge reference, not incidental prose like "never merged
// automatically" (which this project's own PR body text and docs use).
const FORBIDDEN_PATTERNS: RegExp[] = [/merge\s*\(/i, /approve\s*\(/i, /auto.?merge/i];

function listFiles(dir: string, predicate: (file: string) => boolean): string[] {
  return fs
    .readdirSync(dir)
    .filter(predicate)
    .map((file) => path.join(dir, file));
}

function assertNoForbiddenPattern(filePath: string): void {
  const contents = fs.readFileSync(filePath, 'utf-8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    expect(
      contents,
      `${path.relative(REPO_ROOT, filePath)} must not match ${pattern} (merge/approve)`,
    ).not.toMatch(pattern);
  }
}

describe('safety guard: nothing in the pipeline merges or approves a pull request automatically', () => {
  it('src/pr/ contains no function call or reference shaped like an automatic merge/approve', () => {
    const files = listFiles(path.join(REPO_ROOT, 'src', 'pr'), (file) => file.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    files.forEach(assertNoForbiddenPattern);
  });

  it('action.yml contains no step shaped like an automatic merge/approve', () => {
    const actionYml = path.join(REPO_ROOT, 'action.yml');
    expect(fs.existsSync(actionYml)).toBe(true);
    assertNoForbiddenPattern(actionYml);
  });

  it('every workflow under .github/workflows/ contains no step shaped like an automatic merge/approve', () => {
    const files = listFiles(path.join(REPO_ROOT, '.github', 'workflows'), (file) =>
      file.endsWith('.yml'),
    );
    expect(files.length).toBeGreaterThan(0);
    files.forEach(assertNoForbiddenPattern);
  });
});
