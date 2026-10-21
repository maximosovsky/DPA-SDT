import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
const root=new URL('../',import.meta.url);
const text=async path=>readFile(new URL(path,root),'utf8');
test('all ten site pages omit obsolete ERC1155 example links and addresses',async()=>{
 const pages=['index','index1','dpa','shares','sale','packages','verify','privacy','terms','contact'];
 for(const page of pages){const html=await text(`${page}.html`);assert.doesNotMatch(html,/example=1|0xB23Ed35bf06D90FF197d00f0792f918808794ecd|0xe604299A2166A5cAE3E72Cd1df25427F06094821/i,page);}
});
test('former example route cannot invoke the removed historical ERC1155 verifier',async()=>{
 const source=await text('client/formation.ts');assert.doesNotMatch(source,/showPublicExample|publicExample|0xB23Ed35bf06D90FF197d00f0792f918808794ecd/i);
});
test('obsolete evidence folders are removed while NFT pilot remains intact',async()=>{
 const names=await readdir(new URL('docs/evidence/base-sepolia/',root));
 for(const obsolete of ['2026-10-14T-pilot','2026-10-14T14-17-38-567Z','2026-10-14-minimal-two-party','2026-10-15-corrected-two-party'])assert.ok(!names.includes(obsolete),obsolete);
 const manifest=JSON.parse(await text('docs/evidence/base-sepolia/nft-package-pilot/manifest.json'));assert.equal(manifest.chainId,84532);assert.ok(manifest.collection);
});
