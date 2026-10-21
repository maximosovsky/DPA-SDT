import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const brand='Self Declared Token | Decentralized Partnership Agreement';
const pages=['index.html','index1.html','dpa.html','shares.html','sale.html','contact.html','privacy.html','terms.html'];
const publicRoot=process.env.PUBLIC_SITE_DIR;
for(const [label,dir] of [['source',root],...(publicRoot?[['public',publicRoot]]:[])]){
  test(`${label}: all eight documents display the exact brand and keep testnet separate`,()=>{
    for(const page of pages){
      const html=readFileSync(join(dir,page),'utf8');
      const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
      const header=html.match(/<a class="brand"[^>]*>([\s\S]*?)<\/a>/)?.[1];
      assert.ok(title?.includes(brand),`${page}: title`);
      assert.ok(header,`${page}: brand link`);
      assert.equal(header.replace(/<small>[\s\S]*?<\/small>/g,'').replace(/<[^>]*>/g,'').trim(),brand,`${page}: visible brand`);
      assert.match(header,/<small>\s*\/ testnet<\/small>/,`${page}: separate testnet`);
      assert.ok(!/CryptoPassport/i.test(title+' '+header),`${page}: old display brand`);
    }
  });
}
test('integrity-bound identity evidence identifiers and archive are not rebranded',()=>{
  const identity=readFileSync(join(root,'src/identity-hash-v2.ts'),'utf8');
  assert.match(identity,/cryptopassport:SDT:identity:v2\\0/);
  assert.match(identity,/cryptopassport-sdt-identity-evidence-v2/);
});
