// Real, single-signer Base Sepolia synthetic-only run. Never accepts a network override.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createPublicClient,createWalletClient,http,parseTransaction,encodeDeployData,encodeFunctionData,getAddress,getContractAddress,keccak256,parseEventLogs,recoverTransactionAddress,serializeTransaction,type Address,type Hex} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {baseSepolia} from 'viem/chains';
import {identityHashV2} from '../src/identity-hash-v2.ts';
import {SYNTHETIC_FIXTURE} from '../src/synthetic-fixture.ts';
import {SYNTHETIC_AGREEMENT,agreementHash,acceptanceTypedData} from '../src/agreement.ts';
import {verifySdtCode,verifyDpaCode} from '../src/contract-provenance.ts';
import {budgetAllows,assertExpectedRevert} from './base-sepolia-safety.ts';
import {executePreparedTransaction} from './base-sepolia-journal.ts';
import {journalDirectory,sourceProvenance} from './base-sepolia-run-state.ts';
import sdtArtifact from '../artifacts/contracts/SDT.sol/SDT.json' with {type:'json'};
import dpaArtifact from '../artifacts/contracts/DPA.sol/DPA.json' with {type:'json'};

const rpc='https://sepolia.base.org', chain=84532, walletPath='C:/Users/1/AppData/Local/hermes/secrets/cryptopassport/base-sepolia-test-wallet.json';
// On this Windows runner file sync does not establish durable directory creation.
// Do not read a signing key, contact RPC, reconcile, or broadcast until a durable
// transaction journal is implemented and verified for the deployment platform.
throw Error('Live Base Sepolia sending disabled: durable transaction journal boundary unsupported on this runner');
const stringify=(v:unknown)=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2)+'\n';
const fixture={...SYNTHETIC_FIXTURE};
const identity=identityHashV2(fixture), version=agreementHash(SYNTHETIC_AGREEMENT);
const secret=JSON.parse(await readFile(walletPath,'utf8')) as {address:Address;privateKey:Hex;chainId:number};
if(secret.chainId!==chain||!/^0x[0-9a-fA-F]{64}$/.test(secret.privateKey))throw Error('Dedicated test wallet metadata invalid');
const account=privateKeyToAccount(secret.privateKey);if(account.address!==getAddress(secret.address))throw Error('Dedicated test wallet mismatch');
// Prevent accidental inspection/serialization of the secret in the evidence object.
delete (secret as Partial<typeof secret>).privateKey;
const pub=createPublicClient({chain:baseSepolia,transport:http(rpc,{retryCount:2,timeout:20000})});
const wallet=createWalletClient({account,chain:baseSepolia,transport:http(rpc,{retryCount:0,timeout:20000})});
if(await pub.getChainId()!==chain)throw Error('RPC is not Base Sepolia');
const provenance=await sourceProvenance(resolve('.'));
const revision=provenance.baseRevision;
const dir=resolve(process.argv[2]??`docs/evidence/base-sepolia/${new Date().toISOString().replace(/[:.]/g,'-')}`);
if(dir.toLowerCase()===resolve('docs/evidence/base-sepolia/2026-10-14T-pilot').toLowerCase())throw Error('Historical published pilot is read-only; do not resume or rewrite its evidence');
// A run's journal is derived from its resolved evidence path, not caller-selected.
const privateRoot=resolve('C:/Users/1/AppData/Local/hermes/secrets/cryptopassport/base-sepolia-journals');
const journalDir=journalDirectory(privateRoot,dir,process.env.BASE_SEPOLIA_JOURNAL_DIR);
await mkdir(dir,{recursive:true});
type Row={name:string;hash:Hex;receipt:Record<string,unknown>;feeWei:string;l1FeeWei:string|null;balanceAfterWei:string};
type Manifest={chainId:number;network:string;rpc:string;sourceRevision:string;provenance:Awaited<ReturnType<typeof sourceProvenance>>;syntheticOnly:boolean;participantCount:number;wallet:Address;fixture:typeof fixture;identityHash:Hex;agreement:{text:string;hash:Hex};compiler:string;contracts:{sdt?:Address;dpa?:Address};transactions:Row[];checks:Record<string,unknown>;initialBalanceWei:string;initialNonce:number;limits:Record<string,unknown>};
let m:Manifest;
try {m=JSON.parse(await readFile(resolve(dir,'manifest.json'),'utf8'));if(m.chainId!==chain||m.wallet!==account.address||m.sourceRevision!==revision||JSON.stringify(m.provenance)!==JSON.stringify(provenance)||m.identityHash!==identity||m.agreement.hash!==version)throw Error('Manifest mismatch; refusing resume');}
catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const balance=await pub.getBalance({address:account.address}),nonce=await pub.getTransactionCount({address:account.address});if(nonce!==0)throw Error('No manifest and wallet nonce not zero; manual recovery required');m={chainId:chain,network:'Base Sepolia',rpc,sourceRevision:revision,provenance,syntheticOnly:true,participantCount:1,wallet:account.address,fixture,identityHash:identity,agreement:{text:SYNTHETIC_AGREEMENT,hash:version},compiler:'solc 0.8.28 optimizer 200',contracts:{},transactions:[],checks:{},initialBalanceWei:String(balance),initialNonce:nonce,limits:{finality:'sequencer-confirmed only; no L1 finality claim',explorerVerification:'pending; no explorer API credential'}};await writeFile(resolve(dir,'manifest.json'),stringify(m));}
const save=()=>writeFile(resolve(dir,'manifest.json'),stringify(m));
async function send(name:string,data:Hex,remaining:number,to?:Address){
 const nonce=m.initialNonce+m.transactions.length;
 const pending=m.checks[`pending-${name}`] as Hex|undefined;
 let existing:{raw:Hex;intent:Hex}|undefined;
 try{existing=JSON.parse(await readFile(join(journalDir!,`${name}.json`),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 if(pending&&!existing)throw Error('Pending manifest has no signed journal; manual recovery required');
 // Never re-budget/re-sign a prepared step. Compare signed transaction semantics
 // against the expected step before its raw bytes are permitted to reach RPC.
 if(existing){const tx=parseTransaction(existing.raw);
  if(tx.chainId!==chain||tx.nonce!==nonce||tx.to?.toLowerCase()!==to?.toLowerCase()||tx.data!==data||getAddress(await recoverTransactionAddress({serializedTransaction:existing.raw}))!==account.address)throw Error('Prepared transaction intent mismatch; manual recovery required');
 }
 const options=existing?undefined:await budget(data,remaining,to?{to}:undefined);
 const intent=existing?.intent??keccak256(serializeTransaction({chainId:chain,type:'eip1559',nonce,gas:options!.gas,maxFeePerGas:options!.maxFeePerGas,maxPriorityFeePerGas:options!.maxPriorityFeePerGas,to,data}));
 const hash=await executePreparedTransaction({directory:journalDir!,step:name,chainId:chain,wallet:account.address,nonce,intent,
  sign:()=>wallet.signTransaction({account,chain:baseSepolia,type:'eip1559',nonce,to,data,...options!}),
  nonceAt:tag=>pub.getTransactionCount({address:account.address,blockTag:tag}),
  hasReceipt:async h=>{try{const receipt=await pub.getTransactionReceipt({hash:h});if(receipt.status!=='success')throw Error(`Prepared ${name} reverted; manual recovery required`);return true;}catch(e){if((e as {name?:string}).name==='TransactionReceiptNotFoundError')return false;throw e;}},
  broadcast:raw=>pub.sendRawTransaction({serializedTransaction:raw})});
 if(pending&&pending!==hash)throw Error('Manifest pending hash disagrees with journal');
 return hash;
}
async function codeAt(address:Address){for(let i=0;i<10;i++){const code=await pub.getCode({address});if(code&&code!=='0x')return code;await new Promise(r=>setTimeout(r,1000));}throw Error(`RPC did not expose deployed runtime yet: ${address}`);}
const oracle='0x420000000000000000000000000000000000000F' as const;
const oracleAbi=[{type:'function',name:'getL1Fee',stateMutability:'view',inputs:[{name:'_data',type:'bytes'}],outputs:[{name:'',type:'uint256'}]}] as const;
async function l1Estimate(data:Hex,nonce:number,gas:bigint,maxFeePerGas:bigint){const unsigned=serializeTransaction({chainId:chain,type:'eip1559',nonce,gas,maxFeePerGas,maxPriorityFeePerGas:1000000n,data});return pub.readContract({address:oracle,abi:oracleAbi,functionName:'getL1Fee',args:[unsigned]});}
async function budget(data:Hex,remaining:number,call?:{to:Address}){
 const balance=await pub.getBalance({address:account.address});
 const estimated=await pub.estimateGas({account:account.address,data,...call});
 const fees=await pub.estimateFeesPerGas();
 const gas=estimated*120n/100n+10000n;
 const price=fees.maxFeePerGas;
 const nonce=await pub.getTransactionCount({address:account.address});
 const l1=await l1Estimate(data,nonce,gas,price);
 // All future calls are bounded by 1.5m gas apiece at the current max-fee cap,
 // plus 1e9 wei L1 per transaction, with a 2x contingency.
 const current=gas*price+(l1>1000000000n?l1:1000000000n);
 const maxFuture=1500000n*price+1000000000n;
 const required=2n*(current+BigInt(remaining)*maxFuture);
 if(!budgetAllows(balance,[current,...Array<bigint>(remaining).fill(maxFuture)],2n))throw Error(`INSUFFICIENT_TEST_ETH balanceWei=${balance} requiredWei=${required} priceWei=${price} l1EstimateWei=${l1} gas=${gas} futureOperations=${remaining}`);
 m.limits[`before-${m.transactions.length}`]={balanceWei:String(balance),requiredWei:String(required),estimatedGas:String(estimated),gasLimit:String(gas),maxFeePerGas:String(price),l1EstimateWei:String(l1),futureOperations:remaining};await save();
 return {gas,maxFeePerGas:price,maxPriorityFeePerGas:1000000n};
}
async function record(name:string,hash:Hex){
 // Persist hash before waiting so an interruption cannot cause a blind resubmit.
 m.checks[`pending-${name}`]=hash;await save();
 let r=await pub.waitForTransactionReceipt({hash,timeout:120000});
 if(r.status!=='success')throw Error(`${name} reverted ${hash}`);
 for(let i=0;i<30;i++){
  r=await pub.getTransactionReceipt({hash});
  const block=await pub.getBlock({blockNumber:r.blockNumber});
  if(r.blockHash===block.hash&&!/^0x0+$/.test(r.blockHash))break;
  if(i===29)throw Error(`RPC never returned a canonical receipt for ${name}`);
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 const raw=await (await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_getTransactionReceipt',params:[hash]})})).json();
 if(raw.result?.blockHash!==r.blockHash)throw Error(`Raw receipt mismatch for ${name}`);
 await writeFile(resolve(dir,`${name}-receipt.json`),stringify(raw));
 const fee=r.gasUsed*r.effectiveGasPrice;
 const l1=(r as unknown as {l1Fee?:bigint}).l1Fee;
 const row={name,hash,receipt:JSON.parse(stringify(r)),feeWei:String(fee+(l1??0n)),l1FeeWei:l1===undefined?null:String(l1),balanceAfterWei:String(await pub.getBalance({address:account.address,blockNumber:r.blockNumber}))};
 m.transactions.push(row);delete m.checks[`pending-${name}`];await save();
 return r;
}
async function checkPending(){for(const [key,hash] of Object.entries(m.checks)){if(!key.startsWith('pending-'))continue;const name=key.slice(8);if(m.transactions.some(r=>r.name===name))continue;try{const receipt=await pub.getTransactionReceipt({hash:hash as Hex});if(receipt.status!=='success')throw Error(`Pending ${name} failed; stop`);await record(name,hash as Hex);}catch(e){if((e as {name?:string}).name!=='TransactionReceiptNotFoundError')throw e;}}}
await checkPending();
const done=(name:string)=>m.transactions.some(r=>r.name===name);
let sdt=m.contracts.sdt;
if(!done('deploy-sdt')){
 const data=encodeDeployData({abi:sdtArtifact.abi,bytecode:sdtArtifact.bytecode});
 const predicted=getContractAddress({from:account.address,nonce:BigInt(m.initialNonce+m.transactions.length)});
 const hash=await send('deploy-sdt',data,3);const r=await record('deploy-sdt',hash);if(!r.contractAddress||getAddress(r.contractAddress)!==predicted)throw Error('Unexpected SDT deployed address');sdt=getAddress(r.contractAddress);m.contracts.sdt=sdt;await save();
}
if(!sdt){const r=m.transactions.find(x=>x.name==='deploy-sdt');sdt=getAddress(r?.receipt.contractAddress as string);m.contracts.sdt=sdt;await save();}
verifySdtCode(await codeAt(sdt));m.checks.sdtRuntimeCanonical=true;await save();
let dpa=m.contracts.dpa;
if(!done('deploy-dpa')){
 const data=encodeDeployData({abi:dpaArtifact.abi,bytecode:dpaArtifact.bytecode,args:[sdt,version]});
 const hash=await send('deploy-dpa',data,2);const r=await record('deploy-dpa',hash);if(!r.contractAddress)throw Error('Missing DPA address');dpa=getAddress(r.contractAddress);m.contracts.dpa=dpa;await save();
}
if(!dpa){dpa=getAddress(m.transactions.find(x=>x.name==='deploy-dpa')?.receipt.contractAddress as string);m.contracts.dpa=dpa;await save();}
verifyDpaCode(await codeAt(dpa),dpa,sdt,version,chain);
if(await pub.readContract({address:dpa,abi:dpaArtifact.abi,functionName:'sdt'})!==sdt||await pub.readContract({address:dpa,abi:dpaArtifact.abi,functionName:'agreementHash'})!==version)throw Error('DPA linkage mismatch');m.checks.dpaRuntimeAndImmutablesCanonical=true;await save();
let tokenId=1n;
if(!done('mint')){
 const data=encodeFunctionData({abi:sdtArtifact.abi,functionName:'mint',args:[identity]});
 const hash=await send('mint',data,2,sdt);const r=await record('mint',hash);
 const events=parseEventLogs({abi:sdtArtifact.abi,eventName:'Transfer',logs:r.logs.filter(x=>x.address.toLowerCase()===sdt.toLowerCase())});tokenId=(events[0] as {args:{tokenId:bigint}})?.args.tokenId;if(tokenId===undefined)throw Error('No mint Transfer event');m.checks.tokenId=String(tokenId);await save();
}else tokenId=BigInt(String(m.checks.tokenId??'1'));
const owner=await pub.readContract({address:sdt,abi:sdtArtifact.abi,functionName:'ownerOf',args:[tokenId],blockNumber:BigInt(m.transactions.find(x=>x.name==='mint')!.receipt.blockNumber as string)});
if(!done('burn')&&owner!==account.address)throw Error('Mint owner mismatch');
const recordBefore=await pub.readContract({address:sdt,abi:sdtArtifact.abi,functionName:'records',args:[tokenId],blockNumber:BigInt(m.transactions.find(x=>x.name==='mint')!.receipt.blockNumber as string)});
if(recordBefore[0]!==account.address||recordBefore[1]!==identity||(!done('burn')&&recordBefore[3]))throw Error('Minted record mismatch');
m.checks.mintedRecord={issuer:recordBefore[0],identityHash:recordBefore[1],issuanceBlock:String(recordBefore[2]),burned:recordBefore[3]};await save();
if(!m.checks.transferRejected){
 const transferBlock=done('burn')?BigInt(m.transactions.find(x=>x.name==='accept')!.receipt.blockNumber as string):await pub.getBlockNumber();
 try{await pub.simulateContract({address:sdt,abi:sdtArtifact.abi,functionName:'transferFrom',args:[account.address,account.address,tokenId],account:account.address,blockNumber:transferBlock});throw Error('Transfer unexpectedly succeeded');}
 catch(e){if((e as Error).message==='Transfer unexpectedly succeeded')throw e;assertExpectedRevert(e,/Nontransferable/);m.checks.transferRejected={method:'eth_call simulation',reason:'Nontransferable()',block:String(transferBlock)};await save();}
}
if(!done('accept')){
 const currentNonce=await pub.readContract({address:dpa,abi:dpaArtifact.abi,functionName:'nonces',args:[account.address]});
 let prepared=false;try{await readFile(join(journalDir!,'accept.json'));prepared=true;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 if(currentNonce!==0n&&!(currentNonce===1n&&prepared))throw Error('Unexpected initial nonce');
 const nonce=0n;
 const typed=acceptanceTypedData(chain,dpa,account.address,sdt,version,tokenId,identity,nonce);const signature=await wallet.signTypedData(typed);
 const data=encodeFunctionData({abi:dpaArtifact.abi,functionName:'accept',args:[account.address,tokenId,nonce,signature]});
 const hash=await send('accept',data,1,dpa);await record('accept',hash);
 // The 65-byte signature is public in the accept transaction calldata.
 m.checks.typedAcceptance={domain:typed.domain,message:typed.message,nonceBefore:String(nonce),signaturePublished:true,signatureLocation:'accept transaction calldata'};await save();
}
const acceptance=await pub.readContract({address:dpa,abi:dpaArtifact.abi,functionName:'acceptances',args:[account.address]});
const nonceAfter=await pub.readContract({address:dpa,abi:dpaArtifact.abi,functionName:'nonces',args:[account.address]});
if(acceptance[0]!==tokenId||acceptance[1]!==identity||acceptance[2]!==version||acceptance[4]!==1n||nonceAfter!==1n)throw Error('Acceptance or nonce mismatch');
m.checks.acceptanceBeforeBurn=acceptance.map(String);m.checks.nonceAfterAccept=String(nonceAfter);await save();
{
 const replaySignature=await wallet.signTypedData(acceptanceTypedData(chain,dpa,account.address,sdt,version,tokenId,identity,0n));
 try{await pub.simulateContract({address:dpa,abi:dpaArtifact.abi,functionName:'accept',args:[account.address,tokenId,0n,replaySignature],account:account.address});throw Error('Replay unexpectedly succeeded');}
 catch(e){if((e as Error).message==='Replay unexpectedly succeeded')throw e;assertExpectedRevert(e,/wallet or nonce/);m.checks.replayRejected={method:'eth_call simulation',reason:'wallet or nonce',block:String(await pub.getBlockNumber()),note:'Prior nonce 0 signature reused against the same deployment; fresh deployment has a different verifyingContract domain, so this signature is not valid there.'};await save();}
}
if(!done('burn')){
 const data=encodeFunctionData({abi:sdtArtifact.abi,functionName:'burn',args:[tokenId]});
 const hash=await send('burn',data,0,sdt);await record('burn',hash);
}
const finalRecord=await pub.readContract({address:sdt,abi:sdtArtifact.abi,functionName:'records',args:[tokenId]});
const finalAcceptance=await pub.readContract({address:dpa,abi:dpaArtifact.abi,functionName:'acceptances',args:[account.address]});
const finalNonce=await pub.readContract({address:dpa,abi:dpaArtifact.abi,functionName:'nonces',args:[account.address]});
if(!finalRecord[3]||finalRecord[1]!==identity||stringify(finalAcceptance)!==stringify(acceptance)||finalNonce!==nonceAfter)throw Error('Historic snapshot changed after burn');
try{await pub.readContract({address:sdt,abi:sdtArtifact.abi,functionName:'ownerOf',args:[tokenId]});throw Error('Burned token still owned');}catch(e){if((e as Error).message==='Burned token still owned')throw e;assertExpectedRevert(e,/ERC721NonexistentToken|nonexistent token/);}
m.checks.final={record:finalRecord.map(String),acceptance:finalAcceptance.map(String),nonce:String(finalNonce),burnedOwnerQueryReverted:true,snapshotPreserved:true,finalBalanceWei:String(await pub.getBalance({address:account.address}),)};
await save();
await writeFile(resolve(dir,'ABIs.json'),stringify({SDT:sdtArtifact.abi,DPA:dpaArtifact.abi}));
await writeFile(resolve(dir,'artifacts.json'),stringify({SDT:{bytecodeSha256:createHash('sha256').update(sdtArtifact.bytecode).digest('hex'),deployedBytecodeSha256:createHash('sha256').update(sdtArtifact.deployedBytecode).digest('hex')},DPA:{bytecodeSha256:createHash('sha256').update(dpaArtifact.bytecode).digest('hex'),immutableReferences:dpaArtifact.immutableReferences}}));
console.log(stringify({directory:dir,contracts:m.contracts,transactions:m.transactions.map(({name,hash,feeWei,l1FeeWei,balanceAfterWei,receipt})=>({name,hash,gasUsed:receipt.gasUsed,effectiveGasPrice:receipt.effectiveGasPrice,feeWei,l1FeeWei,balanceAfterWei})),checks:m.checks.final}));
