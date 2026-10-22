import { createMeasurer, type Measurer } from '../measure/index.js';
import type { ExtractedChange, TranslationResult } from '../types.js';
import type { TranslateAttempt, TranslationProvider } from './provider.js';

export interface TranslateAndValidateOptions {
  /** Maximum number of translate->measure cycles before giving up. Default 3. */
  maxAttempts?: number;
}

/**
 * Translates `change.sourceText` into `targetLocale` under the real
 * rendered-width constraint of its component, retrying with feedback on
 * each overflow. The target width is derived once, from the component's
 * own clientWidth (constant regardless of candidate text - cf.
 * src/measure/index.ts), not guessed or configured separately.
 *
 * Owns the Measurer's lifecycle: opens a real browser via createMeasurer
 * and always closes it. For testing the retry logic itself without paying
 * for a real browser, call runTranslationAttempts directly with a fake
 * Measurer instead.
 */
export async function translateAndValidate(
  change: ExtractedChange,
  targetLocale: string,
  provider: TranslationProvider,
  options: TranslateAndValidateOptions = {},
): Promise<TranslationResult> {
  const measurer = await createMeasurer(change.componentPath, change.measureTarget);
  try {
    return await runTranslationAttempts(change, targetLocale, provider, measurer, options);
  } finally {
    await measurer.close();
  }
}

/**
 * The generate->measure->retry loop itself, against an already-open
 * Measurer that the caller owns (and must close). Separated from
 * translateAndValidate so this logic can be tested against a fake
 * Measurer without launching a real browser per test.
 */
export async function runTranslationAttempts(
  change: ExtractedChange,
  targetLocale: string,
  provider: TranslationProvider,
  measurer: Measurer,
  options: TranslateAndValidateOptions = {},
): Promise<TranslationResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseline = await measurer.measure(change.sourceText);
  const targetWidthPx = baseline.clientWidth;

  const previousAttempts: TranslateAttempt[] = [];
  let candidate = change.sourceText;
  let measuredWidth = baseline.measuredWidth;
  let resolved = false;
  let iteration = 0;

  while (iteration < maxAttempts && !resolved) {
    iteration += 1;
    candidate = await provider.translate({
      key: change.key,
      sourceText: change.sourceText,
      targetLocale,
      targetWidthPx,
      previousAttempts: [...previousAttempts],
    });
    const measured = await measurer.measure(candidate);
    measuredWidth = measured.measuredWidth;
    resolved = !measured.overflows;

    if (!resolved) {
      previousAttempts.push({
        text: candidate,
        measuredWidth: measured.measuredWidth,
        clientWidth: targetWidthPx,
      });
    }
  }

  return {
    key: change.key,
    translatedText: candidate,
    measuredWidth,
    iterations: iteration,
    resolved,
  };
}
