import {getAddress,hashDomain,keccak256,stringToHex,toHex,type Address,type Hex,type PublicClient} from 'viem';
import artifact from '../artifacts/contracts/DPAFormation.sol/DPAFormation.json' with {type:'json'};
import {verifySdtCode} from './contract-provenance.ts';
import {draft} from './formation.ts';
function shortString(s:string):Hex {const bytes=stringToHex(s).slice(2);return `0x${bytes.padEnd(62,'0')}${(bytes.length/2).toString(16).padStart(2,'0')}`;}
function wordAddress(a:Address):Hex{return toHex(BigInt(a),{size:32});}
/** Reconstruct all compiler immutables; the document itself requires separately verified evidence. */
export async function verifyFormationCode(pub:PublicClient,address:Address,code:Hex,expectedSdt:Address,chainId:number){
 if(!code||code==='0x')throw Error('Formation contract missing');
 const sdt=getAddress(expectedSdt);
 verifySdtCode(await pub.getCode({address:sdt}));
 const read=(functionName:string)=>pub.readContract({address,abi:artifact.abi,functionName} as any);
 const [linked,documentRef,version,people,shares,agreementHash,versionHash,participantsHash]=await Promise.all(['sdt','documentRef','version','participants','shares','agreementHash','versionHash','participantsHash'].map(read)) as [Address,string,string,Address[],number[],Hex,Hex,Hex];
 if(getAddress(linked)!==sdt)throw Error('Formation SDT linkage mismatch');
 const exact=draft('synthetic validation placeholder',version,people,shares.map(String),true);
 if(agreementHash==='0x'+'0'.repeat(64)||exact.versionHash!==versionHash||exact.participantsHash!==participantsHash)throw Error('Formation hash or allocations mismatch');
 // Compiler-generated immutable IDs change on a clean compile; runtime offsets
 // remain tied to the reviewed bytecode layout. Require the entire offset set.
 const values:Record<number,Hex>={
  647:wordAddress(sdt),268:agreementHash,321:versionHash,519:participantsHash,
  2606:shortString('1'),2557:shortString('Experimental DPA Formation'),
  2861:keccak256(stringToHex('1')),2821:keccak256(stringToHex('Experimental DPA Formation')),
  2656:wordAddress(address),2698:toHex(BigInt(chainId),{size:32}),
  2740:hashDomain({domain:{name:'Experimental DPA Formation',version:'1',chainId:BigInt(chainId),verifyingContract:address},types:{EIP712Domain:[{name:'name',type:'string'},{name:'version',type:'string'},{name:'chainId',type:'uint256'},{name:'verifyingContract',type:'address'}]}})
 };
 const repeated:Record<number,number[]>={647:[1214,1458,1824],268:[1710],321:[1748],519:[1786]};
 const offsets=Object.values(artifact.immutableReferences).flatMap(refs=>(refs as {start:number}[]).map(ref=>ref.start)).sort((a,b)=>a-b);
 const expected=Object.keys(values).map(Number).flatMap(start=>[start,...(repeated[start]??[])]).sort((a,b)=>a-b);
 if(JSON.stringify(offsets)!==JSON.stringify(expected))throw Error('Unexpected formation immutable layout');
 let hex=artifact.deployedBytecode.slice(2);
 for(const [id,refs] of Object.entries(artifact.immutableReferences)){
  const first=(refs as {start:number}[])[0]?.start;
  const primary=Object.keys(values).map(Number).find(start=>start===first||repeated[start]?.includes(first));
  const value=primary===undefined?undefined:values[primary];if(!value)throw Error(`Unknown formation immutable ${id}`);
  for(const ref of refs as {start:number;length:number}[]){if(ref.length!==32||value.length!==66||!(ref.start===primary||repeated[primary!]?.includes(ref.start)))throw Error('Formation immutable width or grouping mismatch');const offset=ref.start*2;hex=hex.slice(0,offset)+value.slice(2)+hex.slice(offset+64);}
 }
 if(code.toLowerCase()!==`0x${hex}`.toLowerCase())throw Error('Formation code does not match canonical runtime and immutable terms');
 return {sdt,documentRef,version,people,shares,agreementHash,versionHash,participantsHash};
}
