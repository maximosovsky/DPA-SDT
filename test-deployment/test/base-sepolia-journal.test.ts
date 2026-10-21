import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {keccak256,type Hex} from 'viem';
import {executePreparedTransaction} from '../scripts/base-sepolia-journal.ts';

const raw='0x02c0' as Hex;
const hash=keccak256(raw);
async function fixture(run:(dir:string,network:{pending:number;latest:number;receipt:boolean;broadcasts:Hex[]})=>Promise<void>){
 const dir=await mkdtemp(join(tmpdir(),'base-sepolia-journal-'));
 try {await run(dir,{pending:0,latest:0,receipt:false,broadcasts:[]});}finally{await rm(dir,{recursive:true,force:true});}
}
function options(dir:string,n:{pending:number;latest:number;receipt:boolean;broadcasts:Hex[]},sign:()=>Promise<Hex>){return {
 directory:dir,step:'mint',chainId:84532,wallet:'0xBd2aa57e6D4a85939a0f635888EaEc9B0F4d0C12' as const,nonce:0,
 sign,nonceAt:async(tag:'pending'|'latest')=>n[tag],hasReceipt:async()=>n.receipt,
 broadcast:async(rawTx:Hex)=>{n.broadcasts.push(rawTx);return hash;}
};}
test('Windows refuses unsupported durable directory boundary before signing or broadcast', {skip:process.platform!=='win32'}, async()=>fixture(async(dir,n)=>{
 await assert.rejects(executePreparedTransaction(options(dir,n,async()=>{throw Error('must not sign');})),/durable directory sync unsupported/);
 assert.equal(n.broadcasts.length,0);
 await assert.rejects(readFile(join(dir,'mint.json'),'utf8'),/ENOENT/);
}));

const durableTest=(name:string,run:()=>Promise<void>)=>test(process.platform==='win32'?`${name} (Windows refuses operation)`:name,async()=>{
 if(process.platform!=='win32')return run();
 await fixture(async(dir,n)=>{
  await assert.rejects(executePreparedTransaction(options(dir,n,async()=>{throw Error('unexpected signing');})),/durable directory sync unsupported/);
  assert.deepEqual(n.broadcasts,[]);
 });
});
durableTest('crash before broadcast persists signed raw transaction and resumes without signing again',async()=>fixture(async(dir,n)=>{
 await assert.rejects(executePreparedTransaction({...options(dir,n,async()=>raw),beforeBroadcast:()=>{throw Error('crash before broadcast');}}),/crash before broadcast/);
 const stored=JSON.parse(await readFile(join(dir,'mint.json'),'utf8'));
 assert.equal(stored.hash,hash);assert.equal(stored.raw,raw);assert.equal(stored.nonce,0);
 const resumed=await executePreparedTransaction(options(dir,n,async()=>{throw Error('must not sign');}));
 assert.equal(resumed,hash);assert.deepEqual(n.broadcasts,[raw]);
}));
durableTest('crash after broadcast resumes exact hash without creating a fresh signed transaction',async()=>fixture(async(dir,n)=>{
 await assert.rejects(executePreparedTransaction({...options(dir,n,async()=>raw),broadcast:async(tx:Hex)=>{n.broadcasts.push(tx);throw Error('RPC response lost');}}),/RPC response lost/);
 const resumed=await executePreparedTransaction(options(dir,n,async()=>{throw Error('must not sign');}));
 assert.equal(resumed,hash);assert.deepEqual(n.broadcasts,[raw,raw]);
}));
durableTest('included prepared transaction is reconciled without broadcast',async()=>fixture(async(dir,n)=>{
 await assert.rejects(executePreparedTransaction({...options(dir,n,async()=>raw),beforeBroadcast:()=>{throw Error('stop');}}),/stop/);
 n.latest=1;n.pending=1;n.receipt=true;
 assert.equal(await executePreparedTransaction(options(dir,n,async()=>{throw Error('must not sign');})),hash);
 assert.equal(n.broadcasts.length,0);
}));
durableTest('consumed nonce without matching receipt fails closed and never signs or broadcasts',async()=>fixture(async(dir,n)=>{
 await assert.rejects(executePreparedTransaction({...options(dir,n,async()=>raw),beforeBroadcast:()=>{throw Error('stop');}}),/stop/);
 n.latest=1;n.pending=1;
 await assert.rejects(executePreparedTransaction(options(dir,n,async()=>{throw Error('must not sign');})),/manual recovery/);
 assert.equal(n.broadcasts.length,0);
}));
durableTest('pending foreign nonce before preparing does not sign',async()=>fixture(async(dir,n)=>{
 n.pending=1;
 await assert.rejects(executePreparedTransaction(options(dir,n,async()=>{throw Error('must not sign');})),/nonce/);
}));
durableTest('journal mismatch rejects a different intent without broadcasting',async()=>fixture(async(dir,n)=>{
 await assert.rejects(executePreparedTransaction({...options(dir,n,async()=>raw),intent:'0x1234',beforeBroadcast:()=>{throw Error('stop');}}),/stop/);
 await assert.rejects(executePreparedTransaction({...options(dir,n,async()=>{throw Error('must not sign');}),intent:'0xabcd'}),/Journal mismatch/);
 assert.equal(n.broadcasts.length,0);
}));
