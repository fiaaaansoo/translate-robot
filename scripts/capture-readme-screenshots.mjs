#!/usr/bin/env node
// Regenerates docs/images/before-overflow.png and docs/images/after-fit.png
// from the real fixtures/toy-repo/ component, using the project's own
// measurement mechanism (real headless Chromium via Playwright) rather
// than a mockup. Run after changing fixtures/toy-repo/component/button.html
// or fixtures/toy-repo/translations.recorded.json.
//
// Usage: node scripts/capture-readme-screenshots.mjs

import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const componentPath = path.join(REPO_ROOT, 'fixtures', 'toy-repo', 'component', 'button.html');
const outDir = path.join(REPO_ROOT, 'docs', 'images');

const NAIVE_OVERFLOWING = 'Reichen Sie Ihren monatlichen Spesenbericht ein';
const CORRECT_RECORDED = 'Spesenbericht einreichen';

// Purely a display aid: a true overflow of only a few CSS px (the real,
// measured amount) would otherwise be illegible at normal screenshot
// resolution. Zooming is the same idea as zooming into a photo of a real
// bug - it does not change the underlying clientWidth/scrollWidth values,
// only how large they render.
const ZOOM = 3;
const MARGIN = 20;

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1400, height: 400 },
  deviceScaleFactor: 2,
});
await page.goto(`file://${componentPath}`);
await page.evaluate((zoom) => {
  document.body.style.zoom = String(zoom);
}, ZOOM);

async function capture(text, outFile) {
  await page.evaluate((t) => {
    document.getElementById('expense-report-submit').textContent = t;
  }, text);
  const info = await page.evaluate(() => {
    const btn = document.getElementById('expense-report-submit');
    const toolbar = document.querySelector('.toolbar');
    const rect = toolbar.getBoundingClientRect();
    return {
      clientWidth: btn.clientWidth,
      scrollWidth: btn.scrollWidth,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });
  await page.screenshot({
    path: path.join(outDir, outFile),
    clip: {
      x: Math.max(0, info.rect.x - MARGIN),
      y: Math.max(0, info.rect.y - MARGIN),
      width: info.rect.width + MARGIN * 2,
      height: info.rect.height + MARGIN * 2,
    },
  });
  console.log(
    `wrote ${outFile} for "${text}" (clientWidth=${info.clientWidth}, scrollWidth=${info.scrollWidth})`,
  );
}

await capture(NAIVE_OVERFLOWING, 'before-overflow.png');
await capture(CORRECT_RECORDED, 'after-fit.png');

await browser.close();
