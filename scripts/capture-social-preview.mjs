#!/usr/bin/env node
// Regenerates docs/images/social-preview.png (1280x640, GitHub social
// preview) from an inline HTML page rendered in headless Chromium.
// GitHub has no API for the social preview: upload the file by hand in
// Settings > General > Social preview.
//
// Usage: node scripts/capture-social-preview.mjs

import { chromium } from 'playwright';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(REPO_ROOT, 'docs', 'images', 'social-preview.png');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; width: 1280px; height: 640px; background: #f4f5f7;
    font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #111827; }
  .wrap { padding: 56px 64px; height: 100%; display: flex; flex-direction: column; }
  h1 { margin: 0; font-size: 84px; letter-spacing: -2px; }
  .sub { margin: 12px 0 0; font-size: 36px; color: #374151; }
  .src { margin: 44px 0 14px; font: 28px ui-monospace, Consolas, monospace; color: #374151; }
  .row { display: flex; gap: 40px; }
  .col { flex: 1; }
  .btn { width: 100%; height: 76px; border-radius: 12px; background: #2563eb; color: #fff;
    font-size: 30px; line-height: 76px; text-align: center; white-space: nowrap; overflow: visible; }
  .bad .btn { text-align: left; padding-left: 24px; overflow: hidden; }
  .tag { margin-top: 14px; font-size: 28px; font-weight: 700; }
  .bad .tag { color: #b91c1c; } .good .tag { color: #15803d; }
  .foot { margin-top: auto; font-size: 26px; color: #4b5563; }
</style></head><body><div class="wrap">
  <h1>translate-robot</h1>
  <p class="sub">i18n translations that fit the UI. Measured, not guessed.</p>
  <div class="src">en: Submit your monthly expense report</div>
  <div class="row">
    <div class="col bad"><div class="btn">Reichen Sie Ihren monatlichen Spesenbericht ein</div><div class="tag">&#10007; overflows</div></div>
    <div class="col good"><div class="btn">Spesenbericht einreichen</div><div class="tag">&#10003; fits</div></div>
  </div>
  <div class="foot">CLI + GitHub Action &middot; opens a PR for human review &middot; Apache-2.0</div>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
await page.setContent(html);
await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${path.relative(REPO_ROOT, out)}`);
