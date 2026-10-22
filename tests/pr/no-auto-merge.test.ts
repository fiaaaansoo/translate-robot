import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PR_SRC_DIR = path.resolve(__dirname, '..', '..', 'src', 'pr');

// Matches an actual call/definition shape (merge(...), approve(...)) or an
// explicit auto-merge reference, not incidental prose like "never merged
// automatically" (which this very module's own PR body text uses).
const FORBIDDEN_PATTERNS: RegExp[] = [/merge\s*\(/i, /approve\s*\(/i, /auto.?merge/i];

describe('src/pr/ safety guard: never merges or approves a pull request automatically', () => {
  it('contains no function call or reference shaped like an automatic merge/approve', () => {
    const files = fs.readdirSync(PR_SRC_DIR).filter((file) => file.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const contents = fs.readFileSync(path.join(PR_SRC_DIR, file), 'utf-8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        expect(contents, `${file} must not match ${pattern} (merge/approve)`).not.toMatch(pattern);
      }
    }
  });
});
