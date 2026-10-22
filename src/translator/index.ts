import { createMeasurer, type Measurer } from '../measure/index.js';
import type { ExtractedChange, TranslationResult } from '../types.js';
import type { TranslateAttempt, TranslationProvider } from './provider.js';

export interface TranslateAndValidateOptions {
  /** Maximum number of translate->measure cycles before giving up. Default 3. */
  maxAttempts?: number;
  /**
   * Injectable for testing, so the retry-loop logic can run against a fake
   * Measurer instead of launching a real browser per test. Defaults to the
   * real createMeasurer.
   */
  createMeasurerImpl?: (componentPath: string, selector: string) => Promise<Measurer>;
}

/**
 * Translates `change.sourceText` into `targetLocale` under the real
 * rendered-width constraint of its component, retrying with feedback on
 * each overflow. The target width is derived once, from the component's
 * own clientWidth (constant regardless of candidate text - cf.
 * src/measure/index.ts), not guessed or configured separately.
 */
export async function translateAndValidate(
  change: ExtractedChange,
  targetLocale: string,
  provider: TranslationProvider,
  options: TranslateAndValidateOptions = {},
): Promise<TranslationResult> {
  const maxAttempts = options.maxAttempts ?? 3;
  const createMeasurerImpl = options.createMeasurerImpl ?? createMeasurer;
  const measurer = await createMeasurerImpl(change.componentPath, change.measureTarget);

  try {
    const baseline = await measurer.measure(change.sourceText);
    const targetWidthPx = baseline.clientWidth;

    const previousAttempts: TranslateAttempt[] = [];
    let lastText = change.sourceText;
    let lastMeasuredWidth = baseline.measuredWidth;

    for (let iteration = 1; iteration <= maxAttempts; iteration += 1) {
      const candidate = await provider.translate({
        key: change.key,
        sourceText: change.sourceText,
        targetLocale,
        targetWidthPx,
        previousAttempts: [...previousAttempts],
      });
      const measured = await measurer.measure(candidate);

      lastText = candidate;
      lastMeasuredWidth = measured.measuredWidth;

      if (!measured.overflows) {
        return {
          key: change.key,
          translatedText: candidate,
          measuredWidth: measured.measuredWidth,
          iterations: iteration,
          resolved: true,
        };
      }

      previousAttempts.push({
        text: candidate,
        measuredWidth: measured.measuredWidth,
        clientWidth: targetWidthPx,
      });
    }

    return {
      key: change.key,
      translatedText: lastText,
      measuredWidth: lastMeasuredWidth,
      iterations: maxAttempts,
      resolved: false,
    };
  } finally {
    await measurer.close();
  }
}
