import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createGitClient } from '../../src/pr/git.js';

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

describe('createGitClient (real local git, real bare "remote", no network)', () => {
  let remoteDir: string;
  let repoDir: string;

  beforeEach(() => {
    remoteDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-git-remote-'));
    git(['init', '--bare'], remoteDir);

    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-git-repo-'));
    git(['init', '-b', 'main'], repoDir);
    git(['config', 'user.email', 'robot@example.com'], repoDir);
    git(['config', 'user.name', 'Translate Robot'], repoDir);
    git(['remote', 'add', 'origin', remoteDir], repoDir);
    fs.writeFileSync(path.join(repoDir, 'README.md'), 'initial\n');
    git(['add', '-A'], repoDir);
    git(['commit', '-m', 'initial commit'], repoDir);
  });

  afterEach(() => {
    fs.rmSync(remoteDir, { recursive: true, force: true });
    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  it('creates a branch off the given base, commits the working tree, and pushes it to origin', async () => {
    const client = createGitClient(repoDir);

    await client.createBranch('i18n-de', 'main');
    fs.writeFileSync(path.join(repoDir, 'de.json'), '{"greeting":"Hallo"}\n');
    await client.commitAll('i18n(de): translate greeting');
    await client.push('i18n-de');

    expect(git(['rev-parse', '--abbrev-ref', 'HEAD'], repoDir).trim()).toBe('i18n-de');
    expect(git(['log', '-1', '--format=%s'], repoDir).trim()).toBe('i18n(de): translate greeting');

    const remoteBranches = git(['branch'], remoteDir);
    expect(remoteBranches).toContain('i18n-de');
    const remoteLog = git(['log', 'i18n-de', '-1', '--format=%s'], remoteDir);
    expect(remoteLog.trim()).toBe('i18n(de): translate greeting');
  });

  it('commitAll stages new, modified, and deleted files', async () => {
    const client = createGitClient(repoDir);
    await client.createBranch('i18n-fr', 'main');

    fs.writeFileSync(path.join(repoDir, 'fr.json'), '{"greeting":"Bonjour"}\n');
    fs.rmSync(path.join(repoDir, 'README.md'));
    await client.commitAll('i18n(fr): translate greeting');

    const changedFiles = git(['show', '--name-status', '--format=', 'HEAD'], repoDir);
    expect(changedFiles).toContain('A\tfr.json');
    expect(changedFiles).toContain('D\tREADME.md');
  });
});
