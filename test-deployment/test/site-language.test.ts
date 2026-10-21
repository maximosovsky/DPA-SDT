import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for(const page of ['index.html','dpa.html','shares.html','sale.html','privacy.html','terms.html','contact.html']) test(`${page} uses English site copy`,()=>{const s=readFileSync(page,'utf8');assert.doesNotMatch(s,/[А-Яа-яЁё]/);assert.ok(s.includes('Synthetic-only research prototype'));assert.match(s,/<footer>[\s\S]*?Maxim Osovsky ·[\s\S]*?<a href="\.\/contact\.html">Contact<\/a>[\s\S]*?<\/footer>/);});
