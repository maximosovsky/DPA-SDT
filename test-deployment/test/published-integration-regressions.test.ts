import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {verifyHistorical} from '../src/historical-verify.ts';
import {SYNTHETIC_FIXTURE} from '../src/synthetic-fixture.ts';
import {SYNTHETIC_BANK_TRACE} from '../client/bank-trace.ts';
import {identityHashV2} from '../src/identity-hash-v2.ts';
import {verifyDocumentBytes} from '../src/package-document.ts';
import {keccak256,stringToHex} from 'viem';
const fields={...SYNTHETIC_FIXTURE,...SYNTHETIC_BANK_TRACE};
const contract='0x710c30a2b84ab72c022e70716a504Bea38754c65';
const wallet='0xBd2aa57e6D4a85939a0f635888EaEc9B0F4d0C12';
const transactionHash='0xfc25ea8d7add412d3a009994fc81defc8035dd3579244ad50e4f3809d77a51eb';
test('live exclusive formation acceptance verifies canonical provenance and exact 13-field historical snapshot',async()=>{
 const r=await verifyHistorical({network:'84532',hostname:'maximosovsky.github.io',contract,wallet,transactionHash,version:'v2',fields});
 assert.equal(r.status,'matched',r.reason);assert.equal(r.contractType,'ExclusiveDPAFormation');assert.equal(r.historicalDeclarationHash,identityHashV2(fields));
});
test('cross-origin HTTPS document exact bytes accepted only with matching committed hash; local bytes use same hash check',async()=>{
 const text=Buffer.from('SYNTHETIC exact agreement bytes\n','utf8');
 const hash=keccak256(stringToHex(text.toString('utf8')));
 assert.equal(verifyDocumentBytes(text,hash),hash);
 assert.throws(()=>verifyDocumentBytes(Buffer.from('different'),hash),/mismatch/i);
});
test('published packages page offers explicit per-collection operator deployment and exact local document import',async()=>{
 const html=await readFile(new URL('../packages.html',import.meta.url),'utf8');
 for(const id of ['deploy-package-sale','deploy-package-loan','agreement-file'])assert.match(html,new RegExp(`id="${id}"`));
});
