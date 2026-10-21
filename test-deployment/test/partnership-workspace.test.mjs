import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page = name => readFileSync(new URL(`../${name}.html`, import.meta.url), 'utf8');
test('workspace starts with three task destinations before the research record', () => {
 const home=page('index');
 for(const text of ['Create agreement','Open invitation']) assert.match(home,new RegExp(text));
 assert.ok(home.indexOf('id="workspace-actions"') < home.indexOf('id="what"'));
 assert.match(home, /href="\.\/dpa\.html#invitation-workflow"/);
 assert.doesNotMatch(home, /example=1/);
 assert.match(home, /<details[^>]*class="[^"]*research/);
});
test('agreement has guided compose, invitation and acceptance regions while preserving controls', () => {
 const html=page('dpa');
 for(const id of ['compose-workflow','invitation-workflow','acceptance-workflow','draft-preview','verified-document','progress','terms','deploy','export-evidence','accept']) assert.match(html,new RegExp(`id="${id}"`));
 assert.ok(html.indexOf('id="compose-workflow"')<html.indexOf('id="invitation-workflow"'));
 assert.ok(html.indexOf('id="invitation-workflow"')<html.indexOf('id="acceptance-workflow"'));
 assert.match(html,/local draft/i);assert.match(html,/full text/i);
 assert.match(html,/<details[^>]*class="[^"]*research/);
});
test('participation introduces SDT basis and disconnect state before advanced instruments', () => {
 const html=page('shares');
 assert.match(html,/My participation/);
 assert.match(html,/self-declared/i);
 assert.match(html,/<details[^>]*class="[^"]*research/);
 assert.ok(html.indexOf('id="participation-overview"')<html.indexOf('id="deploy-loan"'));
 assert.match(html,/href="\/#sdt-tools"/);
 assert.match(page('index'),/id="sdt-tools"/);
});
test('draft preview remains usable disconnected while publication remains wallet-gated',()=>{
 const source=readFileSync(new URL('../client/formation.ts',import.meta.url),'utf8');
 assert.match(source,/\$\('deploy'\)\.disabled=.*!account/);
});
test('participation overview is reset and filled only from verified chain reads',()=>{
 const source=readFileSync(new URL('../client/shares.ts',import.meta.url),'utf8');
 assert.match(source,/function updateParticipation/);
 assert.match(source,/updateParticipation\(.*complete.*claimed.*balance/);
 assert.match(source,/function reset\([\s\S]*?updateParticipation\(\)/);
});
