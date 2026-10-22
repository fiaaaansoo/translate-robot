import { describe, expect, it, vi } from 'vitest';

const closeMock = vi.fn().mockResolvedValue(undefined);

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockRejectedValue(new Error('simulated newPage failure')),
      close: closeMock,
    }),
  },
}));

describe('createMeasurer (browser cleanup on launch-time failure)', () => {
  it('closes the browser if a step after launch() throws, instead of leaking it', async () => {
    const { createMeasurer } = await import('../../src/measure/index.js');

    await expect(createMeasurer('/irrelevant/path.html', '#box')).rejects.toThrow(
      'simulated newPage failure',
    );
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
