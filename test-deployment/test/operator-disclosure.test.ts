import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
for (const page of ['index.html','dpa.html','shares.html','sale.html','privacy.html','terms.html','contact.html','index1.html']) {
 test(`${page} credits the author and links the license and exact profiles`, () => {
  const footer=readFileSync(page,'utf8').split('<footer>')[1].split('</footer>')[0];
  assert.ok(footer.includes('<p>Maxim Osovsky · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · '));
  assert.ok(!footer.includes('Website operator: Maxim Osovsky'));
  for(const url of ['https://github.com/maximosovsky','https://www.linkedin.com/in/osovsky/','https://orcid.org/0009-0004-1594-0940']) assert.ok(footer.includes(`href="${url}"`));
 });
}
