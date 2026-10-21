import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('SDT declaration keeps its baseline address but old fixed DPA is not prefilled',()=>{
 assert.match(html,/<input id="sdt" value="0x0b722613e8bCCbE2873336BC970c0Eb0d459082d"/);
 assert.match(html,/<input id="dpa" value=""/);
});
