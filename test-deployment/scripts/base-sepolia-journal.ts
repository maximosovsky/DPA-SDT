// Operational journal: keep outside the repository; the signed transaction authorizes spending.
import {open,readFile,mkdir} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {keccak256,type Hex} from 'viem';
import {platform} from 'node:os';

type Journal={step:string;chainId:number;wallet:string;nonce:number;intent?:Hex;raw:Hex;hash:Hex};
type Options={directory:string;step:string;chainId:number;wallet:string;nonce:number;intent?:Hex;sign:()=>Promise<Hex>;nonceAt:(tag:'pending'|'latest')=>Promise<number>;hasReceipt:(hash:Hex)=>Promise<boolean>;broadcast:(raw:Hex)=>Promise<Hex>;beforeBroadcast?:()=>void};
export async function executePreparedTransaction(o:Options):Promise<Hex>{
 // Node's Windows file sync does not establish durable directory creation.
 // Refuse even reconciliation: the caller cannot infer whether an entry was lost.
 if(platform()==='win32')throw Error('durable directory sync unsupported on Windows; live sending and restart disabled');
 await mkdir(o.directory,{recursive:true,mode:0o700});
 const syncDirectory=async(path:string)=>{const handle=await open(path,'r');try{await handle.sync();}finally{await handle.close();}};
 // Persist creation of the run directory as well as the journal entry.
 await syncDirectory(dirname(o.directory));
 await syncDirectory(o.directory);
 const path=join(o.directory,`${o.step}.json`);
 let entry:Journal;
 try {entry=JSON.parse(await readFile(path,'utf8')) as Journal;}
 catch(e){
  if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
  if(await o.nonceAt('pending')!==o.nonce||await o.nonceAt('latest')!==o.nonce)throw Error('Wallet nonce differs before signing; manual recovery required');
  const raw=await o.sign(),hash=keccak256(raw);
  entry={step:o.step,chainId:o.chainId,wallet:o.wallet,nonce:o.nonce,intent:o.intent,raw,hash};
  // Exclusive create and sync: no RPC broadcast until signed authorization survives a crash.
  const file=await open(path,'wx',0o600);
  try {await file.writeFile(JSON.stringify(entry)+'\n');await file.sync();}finally{await file.close();}
  await syncDirectory(o.directory);
 }
 if(entry.step!==o.step||entry.chainId!==o.chainId||entry.wallet!==o.wallet||entry.nonce!==o.nonce||entry.intent!==o.intent||!/^0x[0-9a-fA-F]+$/.test(entry.raw)||keccak256(entry.raw)!==entry.hash)throw Error('Journal mismatch; manual recovery required');
 if(await o.hasReceipt(entry.hash))return entry.hash;
 if(await o.nonceAt('latest')>o.nonce)throw Error('Nonce consumed without matching receipt; manual recovery required');
 if(await o.nonceAt('pending')>o.nonce)throw Error('Different pending transaction may occupy nonce; manual recovery required');
 o.beforeBroadcast?.();
 const returned=await o.broadcast(entry.raw);
 if(returned!==entry.hash)throw Error('Broadcast hash mismatch; manual recovery required');
 return entry.hash;
}
