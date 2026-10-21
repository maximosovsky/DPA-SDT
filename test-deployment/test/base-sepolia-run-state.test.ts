import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {journalDirectory,sourceProvenance} from '../scripts/base-sepolia-run-state.ts';

const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
test('journal directory is fixed by resolved evidence run and rejects changed override',()=>{
 const root=resolve(tmpdir(),'private-journals'),run=resolve(tmpdir(),'run-a');
 const expected=join(root,sha(run.toLowerCase()));
 assert.equal(journalDirectory(root,run,undefined),expected);
 assert.equal(journalDirectory(root,run,expected),expected);
 assert.throws(()=>journalDirectory(root,run,join(root,'other')),/differs from fixed journal directory/);
 assert.notEqual(journalDirectory(root,resolve(tmpdir(),'run-b'),undefined),expected);
});

test('provenance binds dirty source, lock and build bytes even when HEAD stays fixed',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'provenance-'));
 try {
  execFileSync('git',['init','-q'],{cwd:dir});
  await mkdir(join(dir,'scripts'));
  await mkdir(join(dir,'artifacts','contracts','SDT.sol'),{recursive:true});
  await mkdir(join(dir,'artifacts','contracts','DPA.sol'),{recursive:true});
  await writeFile(join(dir,'scripts','run-base-sepolia.ts'),'original');
  for(const name of ['scripts/base-sepolia-journal.ts','scripts/base-sepolia-safety.ts','scripts/base-sepolia-run-state.ts','src/identity-hash.ts','src/synthetic-fixture.ts','src/agreement.ts','src/contract-provenance.ts','contracts/SDT.sol','contracts/DPA.sol','hardhat.config.ts']){
   await mkdir(join(dir,name,'..'),{recursive:true});
   await writeFile(join(dir,name),'fixture');
  }
  await writeFile(join(dir,'package-lock.json'),'lock-v1');
  await writeFile(join(dir,'artifacts','contracts','SDT.sol','SDT.json'),JSON.stringify({bytecode:'0x01',deployedBytecode:'0x02'}));
  await writeFile(join(dir,'artifacts','contracts','DPA.sol','DPA.json'),JSON.stringify({bytecode:'0x03',deployedBytecode:'0x04'}));
  execFileSync('git',['add','.'],{cwd:dir});
  execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],{cwd:dir});
  const clean=await sourceProvenance(dir);
  assert.equal(clean.dirty,false);
  assert.equal(clean.sourceFiles['scripts/run-base-sepolia.ts'],sha('original'));
  assert.equal(clean.dependencyLockSha256,sha('lock-v1'));
  assert.equal(clean.buildBytecodeSha256.SDT,sha('0x01'));
  await writeFile(join(dir,'scripts','run-base-sepolia.ts'),'changed');
  await writeFile(join(dir,'package-lock.json'),'lock-v2');
  const artifact=join(dir,'artifacts','contracts','SDT.sol','SDT.json');
  await writeFile(artifact,JSON.stringify({bytecode:'0x05',deployedBytecode:'0x02'}));
  const dirty=await sourceProvenance(dir);
  assert.equal(dirty.baseRevision,clean.baseRevision);
  assert.equal(dirty.dirty,true);
  assert.equal(dirty.sourceFiles['scripts/run-base-sepolia.ts'],sha('changed'));
  assert.equal(dirty.dependencyLockSha256,sha('lock-v2'));
  assert.equal(dirty.buildBytecodeSha256.SDT,sha('0x05'));
  assert.notDeepEqual(dirty,clean);
  assert.equal((await readFile(artifact,'utf8')).includes('0x05'),true);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('published runner refuses live execution before reading private key or contacting RPC',()=>{
 const runner=fileURLToPath(new URL('../scripts/run-base-sepolia.ts',import.meta.url));
 assert.throws(()=>execFileSync(process.execPath,['--experimental-strip-types',runner],{cwd:resolve(fileURLToPath(new URL('..',import.meta.url))),timeout:10000,stdio:'pipe'}),e=>{
  const err=e as {stderr:Buffer};
  assert.match(err.stderr.toString(),/Live Base Sepolia sending disabled.*durable transaction journal/i);
  assert.doesNotMatch(err.stderr.toString(),/ENOENT|fetch failed|RPC/);
  return true;
 });
});
