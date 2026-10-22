import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export interface GitClient {
  createBranch(branchName: string, baseBranch: string): Promise<void>;
  commitAll(message: string): Promise<void>;
  push(branchName: string): Promise<void>;
}

/**
 * Thin wrapper around the git CLI via shelled-out commands, not a
 * library: this module only ever needs branch/commit/push, three
 * operations the git binary already exposes directly, so a library like
 * simple-git would add a dependency without buying anything these plain
 * shell calls don't already give for free. Deliberately has no merge or
 * approve method - this is the only place translate-robot talks to git,
 * and a PR it opens is never merged without a human looking at it first
 * (cf. the safety-guard test under tests/pr/).
 */
export function createGitClient(repoRoot: string): GitClient {
  async function git(args: string[]): Promise<void> {
    await run('git', args, { cwd: repoRoot });
  }

  return {
    async createBranch(branchName: string, baseBranch: string): Promise<void> {
      await git(['checkout', '-b', branchName, baseBranch]);
    },
    async commitAll(message: string): Promise<void> {
      await git(['add', '-A']);
      await git(['commit', '-m', message]);
    },
    async push(branchName: string): Promise<void> {
      await git(['push', '-u', 'origin', branchName]);
    },
  };
}
