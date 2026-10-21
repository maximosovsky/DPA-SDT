import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const availablePort = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close(() => resolve(port));
  });
});
const base = process.env.SITE_URL || `http://127.0.0.1:${availablePort}`;
const server = process.env.SITE_URL ? null : spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(availablePort), '--strictPort'],
  { stdio: 'ignore' });
if (server) {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error('Local typography test server exited');
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch { /* still starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'Local typography test server becomes ready');
}
const routes = ['/', '/dpa.html', '/shares.html', '/sale.html', '/privacy.html', '/terms.html', '/contact.html'];
const browser = await chromium.launch({ headless: true });
try {
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
          ['.button-link', 500], ['main button', 500], ['main summary', 500],
          ['main h1', 500], ['main h2', 500], ['main h3', 500],
          ['main strong', 500]
        ];
        const samples = rules.flatMap(([selector, max]) => [...document.querySelectorAll(selector)]
          .filter(el => getComputedStyle(el).display !== 'none')
          .map(el => ({ selector, max, weight: Number(getComputedStyle(el).fontWeight), text: el.textContent.trim().slice(0, 40) })));
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
} finally { await browser.close(); server?.kill(); }
