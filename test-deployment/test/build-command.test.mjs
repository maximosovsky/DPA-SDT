import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('fresh build compiles every imported contract before pinning canonical artifacts and bundling',()=>{
 assert.equal(pkg.scripts.build,'npm run compile && node scripts/install-pilot-artifacts.mjs && vite build');
});
test('full suite prepares its built-page fixtures instead of depending on earlier manual builds',()=>{
 assert.equal(pkg.scripts.pretest,'npm run build');
});
test('hash command executes the supported thirteen-field v2 suite',()=>{
 assert.equal(pkg.scripts['test:hash'],'node --experimental-strip-types --test test/identity-hash-v2.test.ts');
});
