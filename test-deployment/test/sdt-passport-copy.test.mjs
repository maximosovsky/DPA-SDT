import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.SITE_COPY_ROOT || fileURLToPath(new URL('..', import.meta.url));
const read = (name) => readFileSync(resolve(root, `${name}.html`), 'utf8');
const htmlRoutes = ['index', 'index1', 'dpa', 'shares', 'sale', 'verify', 'privacy', 'terms', 'contact'];

for (const name of htmlRoutes) {
  test(`${name}: old SDT passport definition is absent`, () => {
    const html = read(name);
    assert.doesNotMatch(html, /An SDT is a reusable, self-declared identity basis—not a verified passport\./);
    assert.doesNotMatch(html, /A reusable Self-Declared Token \(SDT\) links a wallet to a declaration; it is not a verified passport or unique-person certificate\./);
    assert.doesNotMatch(html, /SDT — это многоразовая, самостоятельно заявленная идентификационная основа, а не проверенный паспорт\./);
  });
}

test('shares: SDT definition links self-declared identity basis to passport details', () => {
  assert.match(read('shares'), /An SDT is a reusable, self-declared identity basis linked to passport details\./);
});

test('homepage variants: SDT declaration is linked to passport details without implying verification', () => {
  for (const name of ['index', 'index1']) {
    assert.match(read(name), /A reusable Self-Declared Token \(SDT\) links a wallet to self-declared passport details; it is not a verified identity or unique-person certificate\./);
  }
});

test('homepage retains self-declaration limitation without old public-record section', () => {
  assert.match(read('index'), /it is not a verified identity/);
  assert.doesNotMatch(read('index'), /id="public-pilot"/);
});
