import {createPublicClient,http,getAddress,isAddress,decodeFunctionData,recoverTypedDataAddress,type Address,type Hex,type PublicClient} from 'viem';
import {baseSepolia,hardhat} from 'viem/chains';
import dpa from '../artifacts/contracts/DPA.sol/DPA.json' with {type:'json'};
import formation from '../artifacts/contracts/DPAFormation.sol/DPAFormation.json' with {type:'json'};
import exclusiveFormation from '../artifacts/contracts/ExclusiveDPAFormation.sol/ExclusiveDPAFormation.json' with {type:'json'};
import {verifyExclusiveFormationCode} from './exclusive-formation-provenance.ts';
import {identityHashV2,IDENTITY_V2_FIELDS,IDENTITY_V2_CANONICALIZATION,IDENTITY_V2_DOMAIN,type IdentityV2Fields} from './identity-hash-v2.ts';
import {verifySdtCode,verifyDpaCode} from './contract-provenance.ts';
import {verifyFormationCode} from './formation-provenance.ts';
import {acceptanceTypedData} from './agreement.ts';
import {formationTypedData} from './formation.ts';

export const REPORT_TITLE='Технический отчёт о проверке соответствия декларации исторической записи принятия';
export const TOOL_VERSION='historical-sdt-verifier/2.0.0';
export type Scheme='v2';
export const V2_RULE=`Thirteen-field current format: SHA-256 of ${IDENTITY_V2_CANONICALIZATION}; domain ${JSON.stringify(IDENTITY_V2_DOMAIN)}; fields in order: ${IDENTITY_V2_FIELDS.join(', ')}.`;
export const V2_REPEAT='Independently reproduce canonicalIdentityV2 on the 13 exact original strings in the listed order, SHA-256 the resulting bytes, and compare with the acceptance snapshot identityHash. The snapshot contains only bytes32 and does not record the scheme; the selected version is the verifier’s assertion, not inferred from a matching digest.';
export function declarationDigest(version:Scheme,fields:IdentityV2Fields){return identityHashV2(fields);}
export type Status='matched'|'mismatch'|'absent'|'rpc_unavailable'|'unknown_contract'|'invalid_input'|'inconclusive';
export function validateNetwork(value:string,hostname:string){if(value==='84532')return 84532;if(value==='31337'&&['localhost','127.0.0.1'].includes(hostname))return 31337;throw Error('Unsupported network: Base Sepolia only; local 31337 only on localhost');}
export function compareSnapshot(computed:Hex,historical:Hex|null){return historical===null?'unknown':computed.toLowerCase()===historical.toLowerCase()?'match':'mismatch';}
export function validAddress(value:string){if(!isAddress(value))throw Error('Invalid EVM address');return getAddress(value);}
export function validTx(value:string){if(value&&!/^0x[0-9a-fA-F]{64}$/.test(value))throw Error('Invalid transaction hash');return value as Hex|'';}
export type Verification={title:string;toolVersion:string;version:Scheme;checkedAt:string;network:string;chainId:number;contractType:string|null;contractAddress:Address;wallet:Address;sdtAddress:Address|null;tokenId:string|null;transactionHash:Hex|null;blockNumber:string|null;blockHash:Hex|null;computedDeclarationHash:Hex;historicalDeclarationHash:Hex|null;agreementHash:Hex|null;context:Record<string,unknown>;checks:string[];limitations:string[];sources:string[];acceptanceFound:boolean|null;declarationCorrespondence:'match'|'mismatch'|'unknown';status:Status;reason:string};
export type VerifyInput={network:string;hostname:string;contract:string;wallet:string;transactionHash?:string;version?:Scheme;fields:IdentityV2Fields};
export async function verifyHistorical(input:VerifyInput,client?:PublicClient):Promise<Verification>{
 const chainId=validateNetwork(input.network,input.hostname),contractAddress=validAddress(input.contract),wallet=validAddress(input.wallet),supplied=validTx(input.transactionHash??'');
 const version=input.version??'v2';
 const computedDeclarationHash=declarationDigest(version,input.fields);
 const rpc=chainId===84532?'https://sepolia.base.org':'http://127.0.0.1:8545';
 const pub=(client??createPublicClient({chain:chainId===84532?baseSepolia:hardhat,transport:http(rpc,{timeout:20000,retryCount:1})})) as PublicClient;
 const result:Verification={title:REPORT_TITLE,toolVersion:TOOL_VERSION,version,checkedAt:new Date().toString()+' / '+new Date().toISOString(),network:chainId===84532?'Base Sepolia':'Local Hardhat',chainId,contractType:null,contractAddress,wallet,sdtAddress:null,tokenId:null,transactionHash:supplied||null,blockNumber:null,blockHash:null,computedDeclarationHash,historicalDeclarationHash:null,agreementHash:null,context:{},checks:[],limitations:['The current format binds all 13 declared strings; comparison does not authenticate a bank record.','Acceptance stores a bytes32 hash, not the hashing scheme; selected version is asserted by the user and cannot be inferred from the snapshot.','Self-declared values do not establish identity, banking activity, wallet control at the relevant moment, contractual rights or admissibility.','Base Sepolia sequencer/canonical RPC observation is not proof of Ethereum L1 finality.','RPC observations and present contract code do not authenticate external documents or a human person.'],sources:[`JSON-RPC ${rpc} (eth_chainId, eth_getCode, eth_call, eth_getLogs, eth_getTransactionReceipt, eth_getTransactionByHash, eth_getBlockByNumber)`],acceptanceFound:null,declarationCorrespondence:'unknown',status:'inconclusive',reason:''};
 try{
  if(await pub.getChainId()!==chainId)throw Error('RPC chain ID differs from selected chain');
  result.checks.push(`RPC chain ID ${chainId} confirmed`);
  const code=await pub.getCode({address:contractAddress});
  if(!code||code==='0x'){result.status='unknown_contract';result.reason='No contract code at this address';return result;}
  let abi:any,record:any,blockNumber:bigint,formationContext:any;
  // The getter shape is used only for classification; complete runtime comparison follows before any positive finding.
  let linked:Address;
  try{linked=validAddress(await pub.readContract({address:contractAddress,abi:dpa.abi,functionName:'sdt'} as any) as string);}catch{result.status='unknown_contract';result.reason='No supported DPA/Formation sdt() getter';return result;}
  const sdtCode=await pub.getCode({address:linked});
  try{verifySdtCode(sdtCode);result.sdtAddress=linked;result.checks.push('Linked SDT canonical runtime bytes verified');}catch(e){result.status='unknown_contract';result.reason=String(e);return result;}
  const exclusiveKind=code.length===exclusiveFormation.deployedBytecode.length;
  const formationKind=exclusiveKind||code.length===formation.deployedBytecode.length;
  try{
   if(exclusiveKind){
    const factory=validAddress(await pub.readContract({address:contractAddress,abi:exclusiveFormation.abi,functionName:'factory'} as any) as string);
    const issuer=validAddress(await pub.readContract({address:contractAddress,abi:exclusiveFormation.abi,functionName:'issuer'} as any) as string);
    formationContext=await verifyExclusiveFormationCode(pub,contractAddress,factory,issuer,linked,chainId);
    result.contractType='ExclusiveDPAFormation';abi=exclusiveFormation.abi;
    result.agreementHash=formationContext.agreementHash;
    result.context={factory,issuer,version:formationContext.version,versionHash:formationContext.versionHash,participantsHash:formationContext.participantsHash,participants:formationContext.people,shares:formationContext.shares,documentRef:formationContext.documentRef};
    result.checks.push('Exclusive formation, canonical factory, bound issuer, constructor immutables and participant-allocation hashes verified');
   }else if(formationKind){formationContext=await verifyFormationCode(pub,contractAddress,code,linked,chainId);result.contractType='DPAFormation';abi=formation.abi;result.agreementHash=formationContext.agreementHash;result.context={version:formationContext.version,versionHash:formationContext.versionHash,participantsHash:formationContext.participantsHash,participants:formationContext.people,shares:formationContext.shares,documentRef:formationContext.documentRef};result.checks.push('Formation canonical runtime, all constructor immutables, version and participant-allocation hashes verified');}
   else{const hash=await pub.readContract({address:contractAddress,abi:dpa.abi,functionName:'agreementHash'} as any) as Hex;verifyDpaCode(code,contractAddress,linked,hash,chainId);result.contractType='DPA';abi=dpa.abi;result.agreementHash=hash;result.context={};result.checks.push('DPA canonical runtime and all constructor immutables verified');}
  }catch(e){result.status='unknown_contract';result.reason=`Unsupported or forged contract: ${String(e)}`;return result;}
  if(formationKind&&!formationContext.people.some((p:Address)=>p.toLowerCase()===wallet.toLowerCase())){result.status='absent';result.acceptanceFound=false;result.reason='Wallet is not in this Formation participant list';return result;}
  record=await pub.readContract({address:contractAddress,abi,functionName:'acceptances',args:[wallet]} as any);
  const found=formationKind?record[3]===true:record[4]>0n;
  if(!found){result.status='absent';result.acceptanceFound=false;result.reason='No stored acceptance for this wallet in the verified contract';return result;}
  result.acceptanceFound=true;result.tokenId=String(record[0]);result.historicalDeclarationHash=record[1];blockNumber=formationKind?record[2]:record[3];result.blockNumber=String(blockNumber);
  if(!formationKind&&record[2].toLowerCase()!==result.agreementHash!.toLowerCase()){result.status='inconclusive';result.reason='Stored agreement hash differs from contract immutable';return result;}
  result.checks.push('Historical acceptance snapshot read for specified wallet (not current SDT owner or current token record)');
  const block=await pub.getBlock({blockNumber});result.blockHash=block.hash;
  const events=await pub.getLogs({address:contractAddress,event:abi.find((e:any)=>e.type==='event'&&e.name==='Accepted'),args:{wallet},fromBlock:blockNumber,toBlock:blockNumber} as any);
  const matching=events.filter((event:any)=>event.args?.wallet?.toLowerCase()===wallet.toLowerCase()&&BigInt(event.args.tokenId)===BigInt(result.tokenId!)&&event.args.identityHash?.toLowerCase()===result.historicalDeclarationHash!.toLowerCase()&&event.blockHash?.toLowerCase()===block.hash?.toLowerCase()&&(formationKind||event.args.agreementHash?.toLowerCase()===result.agreementHash!.toLowerCase()));
  if(matching.length!==1){result.status='inconclusive';result.reason='Expected exactly one matching Accepted event in stored acceptance block';return result;}
  const event:any=matching[0];result.checks.push('Accepted event matches wallet, token, declaration snapshot, agreement (when emitted) and canonical block');
  if(supplied&&supplied.toLowerCase()!==event.transactionHash.toLowerCase()){result.status='inconclusive';result.reason='Supplied transaction is not the matching acceptance event transaction';return result;}
  result.transactionHash=event.transactionHash;
  const [receipt,tx]=await Promise.all([pub.getTransactionReceipt({hash:event.transactionHash}),pub.getTransaction({hash:event.transactionHash})]);
  if(receipt.status!=='success'||receipt.blockNumber!==blockNumber||receipt.blockHash.toLowerCase()!==block.hash?.toLowerCase()||!receipt.logs.some(l=>l.transactionHash.toLowerCase()===event.transactionHash.toLowerCase()&&l.logIndex===event.logIndex&&l.address.toLowerCase()===contractAddress.toLowerCase())||tx.to?.toLowerCase()!==contractAddress.toLowerCase()||tx.blockHash?.toLowerCase()!==block.hash?.toLowerCase()){
   result.status='inconclusive';result.reason='Receipt, event, transaction destination or canonical block mismatch';return result;
  }
  result.checks.push('Successful receipt, event log, transaction destination and block hash cross-checked');
  let decoded;
  try{decoded=decodeFunctionData({abi,data:tx.input});}catch{result.status='inconclusive';result.reason='Acceptance calldata cannot be decoded';return result;}
  if(decoded.functionName!=='accept'){result.status='inconclusive';result.reason='Transaction calldata is not accept()';return result;}
  const [signedWallet,tokenId,nonce,signature]=decoded.args as [Address,bigint,bigint,Hex];
  if(signedWallet.toLowerCase()!==wallet.toLowerCase()||tokenId!==BigInt(result.tokenId)||nonce!==BigInt(event.args.nonce)){
   result.status='inconclusive';result.reason='Calldata wallet, token or nonce differs from event and snapshot';return result;
  }
  result.context={...result.context,acceptanceNonce:String(nonce),relayer:tx.from.toLowerCase()!==wallet.toLowerCase(),transactionSender:tx.from};
  result.checks.push('Calldata wallet, token and nonce bound to matching acceptance event; tx.from is not assumed to be signer');
  const typed=formationKind?formationTypedData(chainId,contractAddress,wallet,linked,result.agreementHash!,formationContext.versionHash,formationContext.participantsHash,tokenId,result.historicalDeclarationHash!,nonce):acceptanceTypedData(chainId,contractAddress,wallet,linked,result.agreementHash!,tokenId,result.historicalDeclarationHash!,nonce);
  try{const signer=await recoverTypedDataAddress({...typed,signature} as any);if(signer.toLowerCase()!==wallet.toLowerCase())throw Error('Signer does not match acceptance wallet');result.checks.push('EIP-712 calldata signature recovered against chain, contract, wallet, SDT, declaration and agreement terms');}
  catch{result.status='inconclusive';result.reason='Signature recovery or EIP-712 context mismatch';return result;}
  result.declarationCorrespondence=compareSnapshot(computedDeclarationHash,result.historicalDeclarationHash);
  result.status=result.declarationCorrespondence==='match'?'matched':'mismatch';
  result.reason=result.status==='matched'?'Предъявленные сведения соответствуют декларации, сохранённой при принятии соглашения указанным кошельком':'Presented declaration SHA-256 differs from historical acceptance snapshot';
  result.limitations.push('No current ownerOf or SDT records() requirement: burned tokens and later changes cannot erase this stored acceptance.');
  return result;
 }catch(e){result.status='rpc_unavailable';result.reason=`RPC read failed or inconsistent response: ${e instanceof Error?e.message:String(e)}`;result.limitations.push('No positive conclusion when RPC data is unavailable.');return result;}
}
export function buildReport(result:Record<string,unknown>,fields:IdentityV2Fields,includePII:boolean){return {...result,title:REPORT_TITLE,toolVersion:TOOL_VERSION,version:'v2',algorithm:'SHA-256',hashBoundFields:IDENTITY_V2_FIELDS,serialization:V2_RULE,independentRepetition:V2_REPEAT,...(includePII?{disclosedFields:Object.fromEntries(IDENTITY_V2_FIELDS.map(key=>[key,fields[key as keyof IdentityV2Fields]])),privacyWarning:'Contains original identity and banking declaration; share only deliberately.'}:{disclosedFieldsIncluded:false})};}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function reportHtml(report:Record<string,unknown>){const rows=Object.entries(report).map(([key,value])=>`<tr><th scope="row">${escapeHtml(key)}</th><td><pre>${escapeHtml(typeof value==='string'?value:JSON.stringify(value,null,2)??'null')}</pre></td></tr>`).join('');return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escapeHtml(REPORT_TITLE)}</title><style>body{font:16px/1.5 Georgia,serif;max-width:960px;margin:2rem auto;padding:1rem;color:#15212a}table{border-collapse:collapse;width:100%}th,td{padding:.7rem;border:1px solid #aab;vertical-align:top;text-align:left;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}th{width:23%}@media print{body{margin:0}}</style></head><body><h1>${escapeHtml(REPORT_TITLE)}</h1><p>Technical observations only; not identity, bank, legal-rights or court admissibility certification.</p><table>${rows}</table></body></html>`;}
