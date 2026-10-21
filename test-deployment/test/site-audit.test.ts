import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=(page:string)=>readFileSync(`${page}.html`,'utf8');
test('obsolete public example is absent but agreement evidence import remains',()=>{const index=html('index'),dpa=html('dpa');assert.doesNotMatch(index,/example=1/);assert.doesNotMatch(dpa,/id="public-example"/);assert.match(dpa,/id="import-evidence"/);});
test('new agreement is primary and SDT declaration tools retain the baseline controls',()=>{const page=html('index');assert.ok(page.indexOf('Create agreement')<page.indexOf('<details class="legacy" id="sdt-tools">'));assert.match(page,/<details class="legacy" id="sdt-tools">[\s\S]*SDT declaration tools[\s\S]*id="fullName"/);});
test('local preview states prerequisites without forcing wallet',()=>{const page=html('dpa'),code=readFileSync('client/formation.ts','utf8');assert.match(page,/Preview locally without a wallet/);assert.match(page,/Deploy.*wallet.*SDT/i);const preview=code.match(/\$\('preview'\)\.onclick=[\s\S]*?\$\('export-evidence'\)\.onclick/)?.[0];assert.ok(preview);assert.doesNotMatch(preview,/await guard\(/);});
test('navigation retains functional invitation viewer',()=>{for(const page of ['index','dpa','shares','sale'])assert.match(html(page),/dpa.html/);assert.match(html('shares'),/SDT.*DPA.*accept.*units/is);assert.match(html('sale'),/optional/i);});
