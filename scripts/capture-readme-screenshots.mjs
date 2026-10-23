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
  viewport: { width: 1400, height: 800 },
  deviceScaleFactor: 2,
});
await page.goto(`file://${componentPath}`);
await page.evaluate((zoom) => {
  document.body.style.zoom = String(zoom);
}, ZOOM);

const SOURCE = 'Submit your monthly expense report';

async function capture(text, outFile) {
  await page.evaluate(
    ({ t, source }) => {
      document.getElementById('expense-report-submit').textContent = t;
      // Caption above the real component: the English source string and the
      // measured result, so the screenshot reads on its own in the README.
      let caption = document.getElementById('shot-caption');
      if (!caption) {
        caption = document.createElement('div');
        caption.id = 'shot-caption';
        caption.style.cssText =
          'font: 13px/1.5 ui-monospace, Consolas, monospace; color: #374151; margin-bottom: 8px;';
        const toolbar = document.querySelector('.toolbar');
        const shot = document.createElement('div');
        shot.id = 'shot';
        shot.style.cssText = 'width: fit-content;';
        toolbar.parentNode.insertBefore(shot, toolbar);
        shot.appendChild(caption);
        shot.appendChild(toolbar);
      }
      const btn = document.getElementById('expense-report-submit');
      const over = btn.scrollWidth - btn.clientWidth;
      const verdict =
        over > 0
          ? '<b style="color:#b91c1c">overflows: ' + over + 'px too wide</b>'
          : '<b style="color:#15803d">fits the ' + btn.clientWidth + 'px button</b>';
      caption.innerHTML = 'en: ' + source + '<br>de: ' + verdict;
    },
    { t: text, source: SOURCE },
  );
  const info = await page.evaluate(() => {
    const btn = document.getElementById('expense-report-submit');
    const shot = document.getElementById('shot');
    const rect = shot.getBoundingClientRect();
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
