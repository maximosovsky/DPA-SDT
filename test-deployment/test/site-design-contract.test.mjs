import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pages=['index','dpa','shares','sale','privacy','terms','contact'];
const read=p=>readFileSync(`${p}.html`,'utf8');
for(const page of pages){
 test(`${page}: compact semantic navigation and legal footer`,()=>{
  const html=read(page), main=html.split('<main id="main">')[1].split('</main>')[0];
  assert.ok(html.includes('href="#main"'));
  assert.match(html,/<nav class="site-links" aria-label="Site navigation">/);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,['dpa','shares','sale'].includes(page)?1:0);
  assert.doesNotMatch(main,/<nav[ >]/,'duplicate back/breadcrumb navigation');
  for(const dest of ['/privacy.html','/terms.html','/contact.html']) assert.ok(html.split('<footer>')[1].includes(`href="${dest}"`));
 });
}
test('overview omits obsolete ERC1155 pilot and retains research',()=>{
 const html=read('index');
 assert.doesNotMatch(html,/id="public-pilot"|example=1|0xB23Ed35bf06D90FF197d00f0792f918808794ecd/i);
 assert.match(html,/id="what"/);assert.match(html,/id="sdt-tools"/);
});
for(const page of ['shares','sale']) test(`${page}: connect precedes fuller explanation without losing safety`,()=>{
 const html=read(page), main=html.split('<main id="main">')[1].split('</main>')[0];
 const connect=main.indexOf('id="connect"');
 assert.ok(connect>0&&connect<main.indexOf('id="agreement"'));
 assert.ok(connect<main.indexOf('<details class="flow-details">'));
 assert.ok(main.indexOf('test ETH')<connect,'critical warning before action');
 assert.ok(main.includes('approve')&&main.includes('public')&&main.includes('rights'));
 assert.ok(main.includes('id="network"'));
});
for(const page of ['privacy','terms','contact']) test(`${page}: legal text is subdivided without invented assurances`,()=>{
 const html=read(page);const main=html.split('<main id="main">')[1].split('</main>')[0];
 assert.ok((main.match(/<h2>/g)||[]).length>=3);
 assert.ok((main.match(/<p>/g)||[]).length>=5);
 assert.ok(main.includes('Maxim Osovsky'));
 assert.doesNotMatch(main, /(?:we guarantee|is certified|is fully compliant)/i);
});
