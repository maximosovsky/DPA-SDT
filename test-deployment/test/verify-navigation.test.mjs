import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const pages = ['index.html', 'index1.html', 'dpa.html', 'shares.html', 'packages.html', 'sale.html', 'privacy.html', 'terms.html', 'contact.html', 'verify.html'];
const nav = /<header\b[^>]*>[\s\S]*?<nav\b[^>]*aria-label="Site navigation"[^>]*>([\s\S]*?)<\/nav>[\s\S]*?<\/header>/;

for (const page of pages) {
  test(`${page} exposes the historical verifier in its site navigation`, () => {
    const html = readFileSync(resolve(import.meta.dirname, '..', page), 'utf8');
    const match = html.match(nav);
    assert.ok(match, 'labelled site navigation exists in header');
    const links = [...match[1].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
    assert.equal(links.length, 5, 'the five site destinations are present');
    const verify = links.filter(([, attrs, text]) => text.trim() === 'Verify declaration' && /href="\/verify\.html"/.test(attrs));
    assert.equal(verify.length, 1, 'exactly one visible, named verifier link with Vercel path');
    const active = links.filter(([, attrs]) => /aria-current="page"/.test(attrs));
    assert.equal(active.length, ['dpa.html', 'shares.html', 'packages.html', 'sale.html', 'verify.html'].includes(page) ? 1 : 0);
    if (page === 'verify.html') assert.equal(active[0][0], verify[0][0], 'verifier is active only on verifier page');
    else assert.ok(!/aria-current=/.test(verify[0][1]), 'verifier is not active on other pages');
  });
}
