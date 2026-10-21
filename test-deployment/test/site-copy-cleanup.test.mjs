import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const routes=['index','dpa','shares','sale','privacy','terms','contact'];
const read=name=>readFileSync(new URL(`../${name}.html`,import.meta.url),'utf8');
const main=html=>html.split('<main id="main">')[1].split('</main>')[0];
const footer=html=>html.split('<footer>')[1].split('</footer>')[0];
const mission='A service for documenting partnership agreements between crypto wallet holders, with a basis for participant identification and participation-share records.';
for(const route of routes){
 test(`${route}: footer has no repeated mission but keeps disclosure and routes`,()=>{
  const html=read(route),end=footer(html);
  assert.ok(end);assert.doesNotMatch(end,/class="mission"/);
  if(route==='index')assert.ok(main(html).includes(mission),'single homepage mission');
  else assert.ok(!html.includes(mission),'mission belongs on homepage only');
  for(const path of ['/privacy.html','/terms.html','/contact.html']) assert.ok(end.includes(`href="${path}"`));
  for(const url of ['https://github.com/maximosovsky','https://www.linkedin.com/in/osovsky/','https://orcid.org/0009-0004-1594-0940']) assert.ok(end.includes(`href="${url}"`));
  assert.match(end,/Synthetic-only research prototype/);
  assert.match(html,/<a class="skip-link" href="#main">/);
 });
 test(`${route}: no decorative link or button arrows`,()=>{
  const text=main(read(route));
  for(const match of text.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/g))
   assert.doesNotMatch(match[2],/→\s*(?:<\/span>)?\s*$/,`decorative arrow in ${match[0]}`);
 });
}
test('homepage action links remain distinct and SDT tools stay addressable',()=>{
 const text=main(read('index'));
 assert.match(text,/href="\/dpa.html#compose-workflow"/);
 assert.match(text,/href="\/dpa.html#invitation-workflow"/);
 assert.doesNotMatch(text,/example=1/);
 assert.match(text,/<details class="legacy" id="sdt-tools">/);
 assert.match(text,/Fictional data and test ETH only/);
 assert.doesNotMatch(text,/class="eyebrow"/);
});
test('agreement retains action anchors, fields, evidence warnings and acceptance gates',()=>{
 const text=main(read('dpa'));
 for(const id of ['compose-workflow','invitation-workflow','acceptance-workflow','verified-document','ack','text','export-evidence','deploy','import-evidence','accept'])assert.ok(text.includes(`id="${id}"`),id);
 assert.match(text,/public and permanent/i);assert.match(text,/exact document/i);
 assert.match(text,/real personal information/i);assert.match(text,/verified SDT/i);
 assert.match(text,/each participant/i);
 assert.doesNotMatch(text,/class="eyebrow"|class="step-kicker"/);
 assert.doesNotMatch(text,/<div class="page-jump"/,'section headings already identify steps');
 assert.doesNotMatch(text,/example=1/);
 assert.match(text,/id="import-evidence"/);
});
test('share and sale warnings remain action-specific',()=>{
 const shares=main(read('shares')),sale=main(read('sale'));
 assert.match(shares,/Approval permits|Approval grants/i);
 assert.match(shares,/CURRENT unpledged balance/);
 assert.match(shares,/all participants accept/i);
 assert.match(sale,/Approval grants this sale escrow access to all units/);
 assert.match(sale,/public/i);assert.match(sale,/test ETH/i);
 assert.match(shares,/href="\/#sdt-tools"/);
 assert.match(shares,/href="\/dpa.html#invitation-workflow"/);
 assert.match(sale,/href="\/dpa.html#invitation-workflow"/);
});
test('legal pages retain substantive notices and contact paths',()=>{
 assert.match(main(read('privacy')),/cannot be erased/);
 assert.match(main(read('terms')),/Do not use mainnet/);
 assert.match(main(read('contact')),/private keys/);
});
