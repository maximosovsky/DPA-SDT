import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const pages = ['index.html','index1.html','dpa.html','shares.html','packages.html','sale.html','privacy.html','terms.html','contact.html','verify.html'];
const expected = [['./dpa.html','Create agreement'],['./shares.html','My participation'],['./packages.html','Package NFTs'],['./sale.html','Research & testing'],['./verify.html','Verify declaration']];
for (const page of pages) test(`${page}: five ordered header destinations and accurate current page`, () => {
  const html = readFileSync(join(import.meta.dirname,'..',page),'utf8');
  const header = html.match(/<header\b[\s\S]*?<\/header>/i)?.[0];
  assert.ok(header,'header exists');
  const nav = header.match(/<nav\b[^>]*class="site-links"[^>]*>[\s\S]*?<\/nav>/i)?.[0];
  assert.ok(nav,'site navigation exists');
  const links = [...nav.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map(([,attr,text]) => ({href:attr.match(/href="([^"]+)"/)?.[1],label:text.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim(),current:/aria-current="page"/.test(attr)}));
  assert.deepEqual(links.map(({href,label})=>[href,label]),expected);
  assert.deepEqual(links.filter(l=>l.current).map(l=>l.href),expected.some(([href])=>href===`./${page}`)?[`./${page}`]:[]);
});
test('privacy notice discloses both actual website hosts',()=>{
  const html=readFileSync(join(import.meta.dirname,'..','privacy.html'),'utf8');
  assert.match(html,/Vercel/);
  assert.match(html,/GitHub Pages/);
});
test('navigation keeps full-size keyboard and touch targets, regular weight, and wraps on narrow screens',()=>{
  const css=readFileSync(join(import.meta.dirname,'..','client/site.css'),'utf8');
  assert.match(css,/\.site-links a\{[^}]*min-height:44px/);
  assert.match(css,/\.site-links\{[^}]*flex-wrap:wrap/);
  assert.match(css,/\.site-links\{[^}]*font-weight:400/);
  assert.doesNotMatch(css,/\.site-links a\{[^}]*font-weight:(?:600|700|bold)/);
});
