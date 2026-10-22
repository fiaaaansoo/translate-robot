import { Command } from 'commander';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extractChangesFromFiles } from '../extractor/index.js';
import { translateAndValidate } from '../translator/index.js';
import { createFixtureProvider } from '../translator/fixtureProvider.js';
import { createAnthropicProvider } from '../translator/anthropicProvider.js';
import { openTranslationPr } from '../pr/index.js';
import type { PrChangeSummary } from '../pr/index.js';
import type { GitClient } from '../pr/git.js';
import type { GitHubClient } from '../pr/github.js';
import type { TranslationProvider } from '../translator/provider.js';
import type { ExtractedChange, ExtractionError, TranslationResult } from '../types.js';

export interface RunOptions {
  /** Target repo root; every other relative default is resolved against this. */
  repo: string;
  /** i18n catalog before the change. Omit for the first-ever-add case (treated as empty). */
  oldI18n?: string;
  newI18n: string;
  mapping: string;
  /** Target locale file to write (skipped entirely in --dry-run). */
  i18nTarget: string;
  targetLocale: string;
  /** Extract, translate, and measure only - write nothing, open no PR. */
  dryRun: boolean;
  /** Use pre-recorded translations instead of a real LLM call (for demos/tests, no API key needed). */
  recordedTranslations?: string;
  /** Required outside --dry-run. */
  owner?: string;
  repoName?: string;
  baseBranch: string;
  branchName: string;
  maxAttempts: number;
  /** Injectable for testing the full (non-dry-run) wiring without a real git repo. */
  git?: GitClient;
  /** Injectable for testing the full (non-dry-run) wiring without a real network call. */
  github?: GitHubClient;
}

export interface RunOutcome {
  results: TranslationResult[];
  errors: ExtractionError[];
  pr: { url: string } | null;
}

/** Upper bound on simultaneously open Chromium instances during translateAllChanges. */
const MAX_CONCURRENT_TRANSLATIONS = 4;

/**
 * Translates every change concurrently (bounded by MAX_CONCURRENT_TRANSLATIONS),
 * instead of one at a time: each translateAndValidate call opens and closes
 * its own real browser, and the changes are fully independent of each other,
 * so serializing them would mean paying N browser launch/close cycles back
 * to back for no correctness reason.
 */
async function translateAllChanges(
  changes: ExtractedChange[],
  provider: TranslationProvider,
  options: Pick<RunOptions, 'targetLocale' | 'maxAttempts'>,
): Promise<{ results: TranslationResult[]; summaries: PrChangeSummary[] }> {
  const summaries: Array<PrChangeSummary | undefined> = new Array(changes.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (let index = nextIndex++; index < changes.length; index = nextIndex++) {
      const change = changes[index]!;
      const result = await translateAndValidate(change, options.targetLocale, provider, {
        maxAttempts: options.maxAttempts,
      });
      summaries[index] = { change, result };
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_TRANSLATIONS, changes.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  const orderedSummaries = summaries as PrChangeSummary[];
  return {
    results: orderedSummaries.map((summary) => summary.result),
    summaries: orderedSummaries,
  };
}

/**
 * Runs the full pipeline (extract -> translate+measure -> optionally open a
 * PR) for one target locale. This is the product's main entry point - see
 * createCli() below for the command-line wiring around it.
 */
export async function runPipeline(options: RunOptions): Promise<RunOutcome> {
  const extraction = extractChangesFromFiles({
    newI18nPath: options.newI18n,
    mappingPath: options.mapping,
    ...(options.oldI18n ? { oldI18nPath: options.oldI18n } : {}),
  });

  const provider = options.recordedTranslations
    ? createFixtureProvider(options.recordedTranslations)
    : createAnthropicProvider();

  const { results, summaries } = await translateAllChanges(extraction.changes, provider, options);

  if (options.dryRun || extraction.changes.length === 0) {
    return { results, errors: extraction.errors, pr: null };
  }

  if (!options.owner || !options.repoName) {
    throw new Error('translate-robot: --owner and --repo-name are required outside --dry-run');
  }

  const pr = await openTranslationPr(summaries, options.targetLocale, {
    repoRoot: options.repo,
    i18nTargetPath: options.i18nTarget,
    baseBranch: options.baseBranch,
    branchName: options.branchName,
    owner: options.owner,
    repo: options.repoName,
    ...(options.git ? { git: options.git } : {}),
    ...(options.github ? { github: options.github } : {}),
  });

  return { results, errors: extraction.errors, pr };
}

function formatResult(result: TranslationResult): string {
  const status = result.resolved ? 'resolved' : 'NOT RESOLVED';
  return `  ${result.key}: "${result.translatedText}" (${result.measuredWidth}px, ${result.iterations} attempt(s), ${status})`;
}

function readOwnVersion(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'),
  ) as {
    version: string;
  };
  return pkg.version;
}

/** Builds the `translate-robot` commander program. Call .parseAsync(argv) to run it. */
export function createCli(): Command {
  const program = new Command();
  program
    .name('translate-robot')
    .description(
      'Translates new UI strings under the real rendered width of their component, and opens a PR for review.',
    )
    .version(readOwnVersion())
    .exitOverride();

  program
    .command('run')
    .description(
      'Extract changed i18n keys, translate and measure them, and (unless --dry-run) open a pull request.',
    )
    .option('--repo <path>', 'target repo root', process.cwd())
    .option('--old-i18n <path>', 'i18n catalog before the change (omit for a first-ever add)')
    .option('--new-i18n <path>', 'i18n catalog after the change (default: <repo>/i18n/en.json)')
    .option('--mapping <path>', 'key -> component mapping file (default: <repo>/i18n-map.json)')
    .option(
      '--i18n-target <path>',
      'target locale file to write (default: <repo>/i18n/<target-locale>.json)',
    )
    .option('--target-locale <locale>', 'target locale', 'de')
    .option(
      '--recorded-translations <path>',
      'use pre-recorded translations instead of calling a real LLM (for demos/tests - no API key needed)',
    )
    .option('--dry-run', 'extract, translate, and measure only - write nothing, open no PR')
    .option('--owner <owner>', 'GitHub repository owner (required outside --dry-run)')
    .option('--repo-name <name>', 'GitHub repository name (required outside --dry-run)')
    .option('--base-branch <branch>', 'base branch for the pull request', 'main')
    .option(
      '--branch-name <name>',
      'branch name for the pull request (default: i18n-<target-locale>)',
    )
    .option(
      '--max-attempts <n>',
      'max translate/measure retries per key',
      (value: string) => Number.parseInt(value, 10),
      3,
    )
    .action(async (opts) => {
      const repo = path.resolve(opts.repo as string);
      const targetLocale = opts.targetLocale as string;

      const runOptions: RunOptions = {
        repo,
        newI18n: opts.newI18n
          ? path.resolve(opts.newI18n as string)
          : path.join(repo, 'i18n', 'en.json'),
        mapping: opts.mapping
          ? path.resolve(opts.mapping as string)
          : path.join(repo, 'i18n-map.json'),
        i18nTarget: opts.i18nTarget
          ? path.resolve(opts.i18nTarget as string)
          : path.join(repo, 'i18n', `${targetLocale}.json`),
        targetLocale,
        dryRun: Boolean(opts.dryRun),
        baseBranch: opts.baseBranch as string,
        branchName: (opts.branchName as string | undefined) ?? `i18n-${targetLocale}`,
        maxAttempts: opts.maxAttempts as number,
        ...(opts.oldI18n ? { oldI18n: path.resolve(opts.oldI18n as string) } : {}),
        ...(opts.recordedTranslations
          ? { recordedTranslations: path.resolve(opts.recordedTranslations as string) }
          : {}),
        ...(opts.owner ? { owner: opts.owner as string } : {}),
        ...(opts.repoName ? { repoName: opts.repoName as string } : {}),
      };

      const outcome = await runPipeline(runOptions);

      for (const error of outcome.errors) {
        console.error(`skipped ${error.key}: ${error.reason}`);
      }
      for (const result of outcome.results) {
        console.log(formatResult(result));
      }
      if (outcome.pr) {
        console.log(`Pull request opened: ${outcome.pr.url}`);
      } else if (!runOptions.dryRun && outcome.results.length > 0) {
        console.log('Nothing to commit - the target file already matches these translations.');
      }
    });

  return program;
}
