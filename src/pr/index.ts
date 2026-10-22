import * as fs from 'node:fs';
import type { ExtractedChange, TranslationResult } from '../types.js';
import { mergeTranslations } from './i18nFile.js';
import { createGitClient, type GitClient } from './git.js';
import { createGitHubClient, type GitHubClient } from './github.js';

/** One translated key, paired with the extractor context it came from (for the PR body's component reference). */
export interface PrChangeSummary {
  change: ExtractedChange;
  result: TranslationResult;
}

export interface OpenTranslationPrOptions {
  /** Local checkout to commit/push from. */
  repoRoot: string;
  /** Absolute path to the target locale's i18n file, e.g. .../i18n/de.json. */
  i18nTargetPath: string;
  baseBranch: string;
  branchName: string;
  owner: string;
  repo: string;
  /** Injectable for testing; defaults to the real git CLI wrapper. */
  git?: GitClient;
  /** Injectable for testing; defaults to the real GitHub REST API client. */
  github?: GitHubClient;
}

/**
 * Writes the translated keys into the target locale file, commits them on
 * a new branch, and opens a pull request for human review. Returns null
 * if there was nothing to commit (the merged file is byte-for-byte
 * identical to what's already there), rather than opening an empty PR.
 *
 * Non-negotiable safety boundary: this module never merges or approves a
 * pull request - GitClient and GitHubClient (cf. git.ts/github.ts) simply
 * have no such method, and a dedicated test under tests/pr/ guards
 * against one being added. One PR per run; the PR is always left for a
 * human.
 */
export async function openTranslationPr(
  summaries: PrChangeSummary[],
  targetLocale: string,
  options: OpenTranslationPrOptions,
): Promise<{ url: string } | null> {
  const git = options.git ?? createGitClient(options.repoRoot);
  const github = options.github ?? createGitHubClient();

  // Branch first, so a failure past this point never leaves translated
  // content sitting uncommitted on the base branch's working tree.
  await git.createBranch(options.branchName, options.baseBranch);

  const updates: Record<string, string> = {};
  for (const { change, result } of summaries) {
    updates[change.key] = result.translatedText;
  }

  const existingRaw = fs.existsSync(options.i18nTargetPath)
    ? fs.readFileSync(options.i18nTargetPath, 'utf-8')
    : undefined;
  fs.writeFileSync(
    options.i18nTargetPath,
    mergeTranslations(existingRaw, options.i18nTargetPath, updates),
  );

  const title = `i18n(${targetLocale}): translate ${summaries.length} key(s)`;
  const committed = await git.commitAll(title);
  if (!committed) {
    return null;
  }
  await git.push(options.branchName);

  return github.openPullRequest({
    owner: options.owner,
    repo: options.repo,
    title,
    body: buildPrBody(summaries, targetLocale),
    head: options.branchName,
    base: options.baseBranch,
  });
}

function buildPrBody(summaries: PrChangeSummary[], targetLocale: string): string {
  const lines = [
    `Automated translation for locale \`${targetLocale}\`. **This PR is never merged automatically - please review before merging.**`,
    '',
  ];
  for (const { change, result } of summaries) {
    const warning = result.resolved
      ? ''
      : ' - ⚠️ **NOT RESOLVED**: still overflows its component after the maximum number of attempts, please review manually';
    lines.push(
      `- \`${change.key}\`: measured ${result.measuredWidth}px, ${result.iterations} attempt(s), component \`${change.componentPath}\`${warning}`,
    );
  }
  return lines.join('\n');
}
