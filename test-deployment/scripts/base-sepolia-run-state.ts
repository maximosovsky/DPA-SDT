// Run identity and provenance only; this module does not authorize live sending.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join,resolve} from 'node:path';

const sha256=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
const sources=[
 'scripts/run-base-sepolia.ts','scripts/base-sepolia-journal.ts','scripts/base-sepolia-safety.ts','scripts/base-sepolia-run-state.ts',
 'src/identity-hash.ts','src/synthetic-fixture.ts','src/agreement.ts','src/contract-provenance.ts',
 'contracts/SDT.sol','contracts/DPA.sol','hardhat.config.ts'
];

export function journalDirectory(privateRoot:string,evidenceDirectory:string,override?:string){
 const run=resolve(evidenceDirectory).toLowerCase();
 const directory=join(resolve(privateRoot),sha256(run));
 if(override!==undefined&&resolve(override).toLowerCase()!==directory.toLowerCase())throw Error('BASE_SEPOLIA_JOURNAL_DIR differs from fixed journal directory for this evidence run');
 return directory;
}

export async function sourceProvenance(root:string){
 const git=(args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const sourceFiles:Record<string,string>={};
 for(const path of sources)sourceFiles[path]=sha256(await readFile(join(root,path)));
 const artifact=async(name:'SDT'|'DPA')=>JSON.parse(await readFile(join(root,'artifacts','contracts',`${name}.sol`,`${name}.json`),'utf8')) as {bytecode:string;deployedBytecode:string};
 const sdt=await artifact('SDT'),dpa=await artifact('DPA');
 return {
  baseRevision:git(['rev-parse','HEAD']),
  dirty:git(['status','--porcelain','--untracked-files=all'])!=='',
  sourceFiles,
  dependencyLockSha256:sha256(await readFile(join(root,'package-lock.json'))),
  buildBytecodeSha256:{SDT:sha256(sdt.bytecode),DPA:sha256(dpa.bytecode)},
  buildRuntimeBytecodeSha256:{SDT:sha256(sdt.deployedBytecode),DPA:sha256(dpa.deployedBytecode)}
 };
}
