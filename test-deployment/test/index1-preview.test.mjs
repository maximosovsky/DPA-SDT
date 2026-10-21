import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const original = read('index.html');
const preview = () => read('index1.html');
const main = text => text.split('<main id="main">')[1]?.split('</main>')[0];
const ids = text => [...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]).sort();

test('canonical homepage has only the approved branding, footer and declaration copy', () => {
 assert.doesNotMatch(original,/example=1|0xB23Ed35bf06D90FF197d00f0792f918808794ecd/i);
 assert.ok(!original.includes('index1.html'), 'preview is not linked from production homepage');
 assert.ok(!read('client/site.css').includes('index1-preview'), 'no preview rules in shared CSS');
});

test('preview keeps all current homepage controls, destinations, warnings and disclosure', () => {
 const html = preview();
 assert.deepEqual(ids(html), ids(original), 'preserve every existing DOM ID used by main.ts');
 for (const href of [...original.matchAll(/\bhref="([^"]+)"/g)].map(m => m[1])) assert.ok(html.includes(`href="${href}"`), `missing destination ${href}`);
 for (const text of ['Fictional data and test ETH only.', 'all 13 exact entered synthetic fields', 'unsalted public hash can enable guessing', 'Export contains plaintext synthetic inputs', 'No identity verification or legal certification.']) assert.ok(html.includes(text), `missing warning/disclosure: ${text}`);
 for (const id of ['hash','digest','connect','network','mint','inspect','burn','export','sdt-tools']) assert.ok(html.includes(`id="${id}"`));
 assert.ok(html.includes('<script type="module" src="/client/main.ts"></script>'));
 assert.ok(main(html).indexOf('id="workspace-actions"') < main(html).indexOf('id="what"'));
 assert.doesNotMatch(html, /verified testnet wallet|certified passport|authenticity stamp/i);
});

test('preview no longer publishes obsolete ERC1155 allocation or record',()=>{assert.doesNotMatch(preview(),/id="public-pilot"|6000&lt;4000|example=1/);});
test('all eight footers carry exact linked CC BY 4.0 attribution and retain prior links', () => {
 for (const page of ['index','dpa','shares','sale','privacy','terms','contact','index1']) {
  const footer=read(`${page}.html`).split('<footer>')[1].split('</footer>')[0];
  assert.match(footer, /<p>Maxim Osovsky · <a href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/">CC BY 4\.0<\/a> · /,page);
  assert.doesNotMatch(footer, /Website operator:? Maxim Osovsky|©|&copy;/,page);
  for (const dest of ['https://github.com/maximosovsky','https://www.linkedin.com/in/osovsky/','https://orcid.org/0009-0004-1594-0940','./privacy.html','./terms.html','./contact.html']) assert.ok(footer.includes(`href="${dest}"`),`${page}: ${dest}`);
 }
 for (const page of ['privacy','contact']) assert.match(main(read(`${page}.html`)), /(?:operator|website operator)/i, `${page}: preserve substantive operator disclosure`);
});

test('preview uses an isolated stylesheet and explicit Vite multi-page entry', () => {
 const html = preview(), css = read('client/index1-preview.css');
 assert.match(html, /<title>Self Declared Token \| Decentralized Partnership Agreement · design preview<\/title>/);
 assert.match(html, /href="\.\/client\/site\.css"/);
 assert.match(html, /href="\.\/client\/index1-preview\.css"/);
 assert.match(read('vite.config.ts'), /preview:\s*'index1\.html'/);
 assert.ok(existsSync(new URL('client/index1-preview.css', root)));
 assert.doesNotMatch(html, /fonts\.googleapis|<base |\/assets\/main-|<script[^>]+src="https?:/);
 assert.doesNotMatch(css, /font-weight:\s*(?:600|700|800|900)\b/);
 assert.doesNotMatch(css, /@import|url\(https?:/);
 for (const rule of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|\})\s*([^{}@]+)\s*\{/g)) {
   for (const selector of rule[1].split(',')) assert.match(selector.trim(), /^(?:body\.design-preview|\.design-preview)\b/, `unscoped selector: ${selector}`);
 }
});
