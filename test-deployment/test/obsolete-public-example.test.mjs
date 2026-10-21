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
test('obsolete archives are absent while exclusive NFT and published-nine evidence remains intact',async()=>{
 const names=await readdir(new URL('docs/evidence/base-sepolia/',root));
 for(const obsolete of ['2026-10-14T-pilot','2026-10-14T14-17-38-567Z','2026-10-14-minimal-two-party','2026-10-15-corrected-two-party'])assert.ok(!names.includes(obsolete),obsolete);
 assert.ok(!names.includes('nft-package-pilot'), 'superseded non-exclusive archive is deliberately omitted');
 const manifest=JSON.parse(await text('docs/evidence/base-sepolia/exclusive-nft-package/manifest.json'));
 assert.equal(manifest.chainId,84532);assert.equal(manifest.syntheticOnly,true);
 for(const key of ['factory','formation','collection','sale','loan']) assert.match(manifest[key],/^0x[0-9a-fA-F]{40}$/);
 assert.deepEqual(manifest.allocations,[60,40]);
 for(const name of ['SDT','ExclusiveDPAFormation','ExclusivePackageFactory','DPAPackageNFTV2','DPAPackageSale','DPAPackageLoan']) assert.match(manifest.artifactHashes[name],/^[0-9a-f]{64}$/);
 const final=JSON.parse(await text('docs/evidence/base-sepolia/published-nine/final-nine-manifest.json'));
 assert.equal(final.chainId,84532);assert.equal(final.scenarioCount,9);
 assert.deepEqual(Object.keys(final.scenarios),['1','2','3','4','5','6','7','8','9']);
 for(const scenario of Object.values(final.scenarios)) assert.equal(scenario.status,'passed');
 assert.equal(final.transactions.count,31);assert.equal(final.transactions.receipts.length,31);
 assert.equal(new Set(final.transactions.receipts.map(r=>r.hash)).size,31);
 const evidence=JSON.parse(await text('docs/evidence/base-sepolia/published-nine/evidence.json'));
 assert.equal(evidence.transactions.length,31,'raw receipts must not be mislabeled as filtered 30');
 assert.deepEqual(new Set(evidence.transactions.map(r=>r.hash)),new Set(final.transactions.receipts.map(r=>r.hash)));
 for(const receipt of final.transactions.receipts) assert.equal(receipt.status,'success');
 const operatorHashes=evidence.scenarios['operator-loan'].hashes;
 assert.equal(operatorHashes.length,1);
 const lifecycle=evidence.transactions.filter(tx=>!operatorHashes.includes(tx.hash));
 assert.equal(lifecycle.length,30,'30 lifecycle receipts exclude the explicit operator-loan deployment');
 assert.equal(evidence.transactions.filter(tx=>operatorHashes.includes(tx.hash)).length,1);
});
