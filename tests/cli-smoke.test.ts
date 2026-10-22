import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('bin/translate-robot (real subprocess, compiled dist/)', () => {
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
