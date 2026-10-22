import { describe, expect, it, vi } from 'vitest';
import type { ExtractedChange } from '../../src/types.js';
import type { TranslationProvider } from '../../src/translator/provider.js';

const closeMock = vi.fn().mockResolvedValue(undefined);

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(undefined),
        evaluate: vi
          .fn()
          .mockResolvedValue({ measuredWidth: 50, clientWidth: 100, overflows: false }),
      }),
      close: closeMock,
    }),
  },
}));

function baseChange(): ExtractedChange {
  return {
    key: 'greeting',
    sourceText: 'Hello there',
    componentPath: '/fake/component.html',
    measureTarget: '#box',
  };
}

describe('translateAndValidate (real createMeasurer lifecycle, mocked browser)', () => {
  it('closes the browser even when the provider throws', async () => {
    const { translateAndValidate } = await import('../../src/translator/index.js');
    const provider: TranslationProvider = {
      async translate(): Promise<string> {
        throw new Error('provider failure');
      },
    };

    await expect(translateAndValidate(baseChange(), 'de', provider)).rejects.toThrow(
      'provider failure',
    );
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
