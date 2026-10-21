import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {startSiteServer} from '../scripts/test-site-server.mjs';

const server=process.env.SITE_URL?null:await startSiteServer();
const base=process.env.SITE_URL||server.base;
const routes = ['/', '/dpa.html', '/shares.html', '/sale.html', '/privacy.html', '/terms.html', '/contact.html'];
let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    for (const route of routes) {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, `${route} HTTP status`);
      const result = await page.evaluate(() => {
        const rules = [
          ['body', 400], ['main p', 400], ['main li', 400], ['main label', 400],
          ['main .record dt', 400], ['main .record dd', 400],
          ['.site-links a', 400], ['footer p', 400], ['footer a', 400],
          ['.brand', 500], ['.eyebrow', 500], ['.section-number', 500],
          ['.button-link', 500], ['main button:not(#sdt-tools button)', 500], ['#sdt-tools button', 700], ['main summary', 500],
          ['main h1', 500], ['main h2', 500], ['main h3', 500],
          ['main strong', 500]
        ];
        const samples = rules.flatMap(([selector, max]) => [...document.querySelectorAll(selector)]
          .filter(el => getComputedStyle(el).display !== 'none')
          .map(el => ({ selector, max: el.matches('.field-error') ? 600 : max, weight: Number(getComputedStyle(el).fontWeight), text: el.textContent.trim().slice(0, 40) })));
        return { samples, overflow: document.documentElement.scrollWidth > innerWidth + 2,
          navHeight: document.querySelector('.site-links a')?.getBoundingClientRect().height };
      });
      for (const { selector, max, weight, text } of result.samples)
        assert.ok(weight <= max, `${route} at ${width}px: ${selector} (${text}) has weight ${weight} > ${max}`);
      assert.equal(result.overflow, false, `${route} at ${width}px overflow`);
      assert.ok(result.navHeight >= 44, `${route} navigation touch target`);
      assert.deepEqual(errors, [], `${route} page errors`);
      console.log(`${width} ${route} ${result.samples.length} computed typography samples OK`);
      page.removeAllListeners('pageerror');
    }
    await page.close();
  }
} finally { await browser?.close(); await server?.stop(); }
