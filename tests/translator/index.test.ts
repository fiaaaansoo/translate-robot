import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateAndValidate } from '../../src/translator/index.js';
import { createFixtureProvider } from '../../src/translator/fixtureProvider.js';
import type { Measurer, MeasureResult } from '../../src/measure/index.js';
import type { TranslateRequest, TranslationProvider } from '../../src/translator/provider.js';
import type { ExtractedChange } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function baseChange(overrides: Partial<ExtractedChange> = {}): ExtractedChange {
  return {
    key: 'greeting',
    sourceText: 'Hello there',
    componentPath: '/fake/component.html',
    measureTarget: '#box',
    ...overrides,
  };
}

/** A Measurer that overflows for any text whose length is >= overflowAtLength. */
function createFakeMeasurer(
  clientWidth: number,
  overflowAtLength: number,
): Measurer & { closed: boolean } {
  const fake = {
    closed: false,
    async measure(candidateText: string): Promise<MeasureResult> {
      if (fake.closed) {
        throw new Error('measure() called after close()');
      }
      const measuredWidth =
        candidateText.length >= overflowAtLength ? clientWidth + 100 : clientWidth - 10;
      return { measuredWidth, clientWidth, overflows: measuredWidth > clientWidth };
    },
    async close(): Promise<void> {
      fake.closed = true;
    },
  };
  return fake;
}

/** A provider that returns its candidates array in order, one per call. */
function createScriptedProvider(
  candidates: string[],
): TranslationProvider & { requests: TranslateRequest[] } {
  const requests: TranslateRequest[] = [];
  let callIndex = 0;
  return {
    requests,
    async translate(request: TranslateRequest): Promise<string> {
      requests.push(request);
      const candidate = candidates[callIndex];
      callIndex += 1;
      return candidate;
    },
  };
}

describe('translateAndValidate (fake measurer + fake provider, retry logic)', () => {
  it('resolves on the first attempt when the first candidate fits', async () => {
    const measurer = createFakeMeasurer(200, 999);
    const provider = createScriptedProvider(['short']);

    const result = await translateAndValidate(baseChange(), 'de', provider, {
      createMeasurerImpl: async () => measurer,
    });

    expect(result).toEqual({
      key: 'greeting',
      translatedText: 'short',
      measuredWidth: 190,
      iterations: 1,
      resolved: true,
    });
    expect(measurer.closed).toBe(true);
  });

  it('retries after an overflow and resolves once a short-enough candidate arrives', async () => {
    const measurer = createFakeMeasurer(200, 10);
    const provider = createScriptedProvider(['this is way too long', 'short']);

    const result = await translateAndValidate(baseChange(), 'de', provider, {
      createMeasurerImpl: async () => measurer,
    });

    expect(result.resolved).toBe(true);
    expect(result.iterations).toBe(2);
    expect(result.translatedText).toBe('short');
  });

  it('returns resolved: false with the last attempt once maxAttempts is reached', async () => {
    const measurer = createFakeMeasurer(200, 0);
    const provider = createScriptedProvider(['too long one', 'too long two', 'too long three']);

    const result = await translateAndValidate(baseChange(), 'de', provider, {
      maxAttempts: 3,
      createMeasurerImpl: async () => measurer,
    });

    expect(result.resolved).toBe(false);
    expect(result.iterations).toBe(3);
    expect(result.translatedText).toBe('too long three');
    expect(measurer.closed).toBe(true);
  });

  it('respects a custom maxAttempts bound', async () => {
    const measurer = createFakeMeasurer(200, 0);
    const provider = createScriptedProvider(['too long one', 'never reached']);

    const result = await translateAndValidate(baseChange(), 'de', provider, {
      maxAttempts: 1,
      createMeasurerImpl: async () => measurer,
    });

    expect(result.resolved).toBe(false);
    expect(result.iterations).toBe(1);
    expect(result.translatedText).toBe('too long one');
  });

  it('derives targetWidthPx from the source text clientWidth measurement, not a fixed guess', async () => {
    const measurer = createFakeMeasurer(321, 999);
    const provider = createScriptedProvider(['short']);

    await translateAndValidate(baseChange(), 'de', provider, {
      createMeasurerImpl: async () => measurer,
    });

    expect(provider.requests[0].targetWidthPx).toBe(321);
  });

  it('accumulates previousAttempts across retries so the provider sees growing feedback', async () => {
    const measurer = createFakeMeasurer(200, 5);
    const provider = createScriptedProvider(['long one', 'long two', 'ok']);

    await translateAndValidate(baseChange(), 'de', provider, {
      maxAttempts: 3,
      createMeasurerImpl: async () => measurer,
    });

    expect(provider.requests[0].previousAttempts).toEqual([]);
    expect(provider.requests[1].previousAttempts).toHaveLength(1);
    expect(provider.requests[1].previousAttempts[0].text).toBe('long one');
    expect(provider.requests[2].previousAttempts).toHaveLength(2);
    expect(provider.requests[2].previousAttempts[1].text).toBe('long two');
  });

  it('closes the measurer even when the provider throws', async () => {
    const measurer = createFakeMeasurer(200, 999);
    const provider: TranslationProvider = {
      async translate(): Promise<string> {
        throw new Error('provider failure');
      },
    };

    await expect(
      translateAndValidate(baseChange(), 'de', provider, {
        createMeasurerImpl: async () => measurer,
      }),
    ).rejects.toThrow('provider failure');
    expect(measurer.closed).toBe(true);
  });
});

describe('translateAndValidate (real measurer + real fixture provider, end to end)', () => {
  it('translates the toy-repo expense report key under the button real rendered width', async () => {
    const provider = createFixtureProvider(
      path.join(REPO_ROOT, 'fixtures', 'toy-repo', 'translations.recorded.json'),
    );
    const change: ExtractedChange = {
      key: 'expense_report_submit',
      sourceText: 'Submit your monthly expense report',
      componentPath: path.join(REPO_ROOT, 'fixtures', 'toy-repo', 'component', 'button.html'),
      measureTarget: '#expense-report-submit',
    };

    const result = await translateAndValidate(change, 'de', provider);

    expect(result.resolved).toBe(true);
    expect(result.translatedText).toBe('Spesenbericht einreichen');
    expect(result.iterations).toBe(1);
  }, 30_000);
});
