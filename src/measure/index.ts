import { chromium } from 'playwright';

export interface MeasureResult {
  /** scrollWidth of the measured node: how wide the content actually needs to be. */
  measuredWidth: number;
  /** clientWidth of the measured node: how wide the box actually is. */
  clientWidth: number;
  /** True when the content visibly spills past the box (measuredWidth > clientWidth). */
  overflows: boolean;
}

export interface Measurer {
  /**
   * Replaces the target node's text with `candidateText` and measures
   * whether it overflows the node's own rendered box. Safe to call
   * repeatedly with different candidates against the same open page.
   */
  measure(candidateText: string): Promise<MeasureResult>;
  /** Closes the underlying browser. Further measure() calls reject. */
  close(): Promise<void>;
}

/**
 * Opens `componentPath` in a headless Chromium page and returns a Measurer
 * bound to `selector` in that page. One browser/page is reused across every
 * `measure()` call so a generate->measure->regenerate retry loop (task 05's
 * own job) doesn't pay a fresh browser launch per attempt.
 *
 * This is deliberately real headless rendering, not a character-count
 * estimate: that is the whole point of the project (cf. PRODUCT.md) - a
 * cheaper proxy would reintroduce exactly the bias this tool exists to
 * avoid.
 */
export async function createMeasurer(componentPath: string, selector: string): Promise<Measurer> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${componentPath}`);

  return {
    async measure(candidateText: string): Promise<MeasureResult> {
      return page.evaluate(
        ({ selector, candidateText }) => {
          const el = document.querySelector(selector);
          if (!el) {
            throw new Error(`measure: selector "${selector}" matched no element in the component`);
          }
          el.textContent = candidateText;
          const measuredWidth = (el as HTMLElement).scrollWidth;
          const clientWidth = (el as HTMLElement).clientWidth;
          return { measuredWidth, clientWidth, overflows: measuredWidth > clientWidth };
        },
        { selector, candidateText },
      );
    },
    async close(): Promise<void> {
      await browser.close();
    },
  };
}
