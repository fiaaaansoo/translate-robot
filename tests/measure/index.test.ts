import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMeasurer, type Measurer } from '../../src/measure/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

describe('createMeasurer (real toy-repo component, real headless browser)', () => {
  let measurer: Measurer;

  beforeAll(async () => {
    const componentPath = path.join(REPO_ROOT, 'fixtures', 'toy-repo', 'component', 'button.html');
    measurer = await createMeasurer(componentPath, '#expense-report-submit');
  }, 30_000);

  afterAll(async () => {
    await measurer.close();
  });

  it('the English source text fits the 320px button', async () => {
    const result = await measurer.measure('Submit your monthly expense report');
    expect(result.overflows).toBe(false);
    expect(result.measuredWidth).toBeLessThanOrEqual(result.clientWidth);
  });

  it('a naive literal German translation overflows the button', async () => {
    const result = await measurer.measure('Reichen Sie Ihren monatlichen Spesenbericht ein');
    expect(result.overflows).toBe(true);
    expect(result.measuredWidth).toBeGreaterThan(result.clientWidth);
  });

  it('the recorded short German translation fits the button', async () => {
    const result = await measurer.measure('Spesenbericht einreichen');
    expect(result.overflows).toBe(false);
  });

  it('clientWidth is the same across calls (only the text node changes)', async () => {
    const a = await measurer.measure('Short');
    const b = await measurer.measure('A completely different but still short text');
    expect(a.clientWidth).toBe(b.clientWidth);
  });
});

describe('createMeasurer (synthetic fixtures, edge cases)', () => {
  let dir: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'measure-test-'));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('text exactly as wide as the container does not count as overflowing', async () => {
    // A single monospace character box: 1 "M" at a known size roughly fills
    // a 20px-wide, 20px-tall box with no padding - loose enough to assert
    // scrollWidth <= clientWidth without pixel-perfect font assumptions.
    const componentPath = path.join(dir, 'exact-fit.html');
    fs.writeFileSync(
      componentPath,
      `<!doctype html><html><body>
        <div id="box" style="display:inline-block;width:200px;white-space:nowrap;box-sizing:border-box;">placeholder</div>
      </body></html>`,
    );
    const measurer = await createMeasurer(componentPath, '#box');
    try {
      const result = await measurer.measure('short text');
      expect(result.overflows).toBe(false);
      expect(result.clientWidth).toBe(200);
    } finally {
      await measurer.close();
    }
  }, 30_000);

  it('throws a clear error when the selector matches nothing', async () => {
    const componentPath = path.join(dir, 'no-selector.html');
    fs.writeFileSync(
      componentPath,
      '<!doctype html><html><body><div id="real"></div></body></html>',
    );
    const measurer = await createMeasurer(componentPath, '#does-not-exist');
    try {
      await expect(measurer.measure('text')).rejects.toThrow(/#does-not-exist/);
    } finally {
      await measurer.close();
    }
  }, 30_000);

  it('rejects further measure() calls after close()', async () => {
    const componentPath = path.join(dir, 'closed.html');
    fs.writeFileSync(componentPath, '<!doctype html><html><body><div id="x">a</div></body></html>');
    const measurer = await createMeasurer(componentPath, '#x');
    await measurer.close();
    await expect(measurer.measure('text')).rejects.toThrow();
  }, 30_000);
});
