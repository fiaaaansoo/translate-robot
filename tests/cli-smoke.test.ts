import { beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('bin/translate-robot (real subprocess, compiled dist/)', () => {
  beforeAll(async () => {
    // bin/translate-robot imports dist/cli/index.js, so this is the one
    // test file that needs a fresh build - scoped here rather than a
    // global `pretest` npm hook, so an unrelated `vitest run <file>` (or a
    // direct `npx vitest run tests/cli-smoke.test.ts`, which a package.json
    // pretest hook would never cover anyway) doesn't pay for a full
    // rebuild it doesn't need.
    await execFileAsync('npm', ['run', 'build']);
  }, 30_000);

  it('prints a version string and exits 0 for --version', async () => {
    const { stdout } = await execFileAsync('node', ['bin/translate-robot', '--version']);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints usage and exits 0 for --help', async () => {
    const { stdout } = await execFileAsync('node', ['bin/translate-robot', '--help']);
    expect(stdout).toContain('translate-robot');
    expect(stdout).toContain('run');
  });
});
