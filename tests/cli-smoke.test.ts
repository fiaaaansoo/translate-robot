import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('bin/translate-robot', () => {
  it('prints a version string and exits 0', async () => {
    const { stdout } = await execFileAsync('node', ['bin/translate-robot']);
    expect(stdout.trim()).toMatch(/^translate-robot v\d+\.\d+\.\d+$/);
  });
});
