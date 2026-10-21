import {getAddress,hashDomain,keccak256,stringToHex,toHex,type Address,type Hex,type PublicClient} from 'viem';
import formationArtifact from '../artifacts/contracts/ExclusiveDPAFormation.sol/ExclusiveDPAFormation.json' with {type:'json'};
import factoryArtifact from '../artifacts/contracts/ExclusivePackageFactory.sol/ExclusivePackageFactory.json' with {type:'json'};
import {verifySdtCode} from './contract-provenance.ts';
import {draft} from './formation.ts';
import {runtimeWithOffsets} from './immutable-runtime.ts';
function short(s:string):Hex {const h=stringToHex(s).slice(2);return `0x${h.padEnd(62,'0')}${(h.length/2).toString(16).padStart(2,'0')}`;}
const addr=(a:Address)=>toHex(BigInt(a),{size:32});
export async function verifyExclusiveFormationCode(pub:PublicClient,formation:Address,factory:Address,issuer:Address,sdt:Address,chainId:number){
 if(await pub.getChainId()!==chainId)throw Error('Wrong chain');
 if((await pub.getCode({address:factory}))?.toLowerCase()!==factoryArtifact.deployedBytecode.toLowerCase())throw Error('Noncanonical factory');
 verifySdtCode(await pub.getCode({address:sdt}));
 const read=(fn:string)=>pub.readContract({address:formation,abi:formationArtifact.abi,functionName:fn} as any);
 const [linked,linkedFactory,linkedIssuer,documentRef,version,people,allocations,agreementHash,versionHash,participantsHash]=await Promise.all(['sdt','factory','issuer','documentRef','version','participants','allocations','agreementHash','versionHash','participantsHash'].map(read)) as [Address,Address,Address,string,string,Address[],number[],Hex,Hex,Hex];
 if(getAddress(linked)!==getAddress(sdt)||getAddress(linkedFactory)!==getAddress(factory)||getAddress(linkedIssuer)!==getAddress(issuer))throw Error('Exclusive linkage mismatch');
 const exact=draft('synthetic validation placeholder',version,people,allocations.map(String),true);
 if(agreementHash==='0x'+'0'.repeat(64)||exact.versionHash!==versionHash||exact.participantsHash!==participantsHash)throw Error('Formation commitments mismatch');
 const values:Record<number,Hex>={701:addr(sdt),761:addr(factory),271:agreementHash,329:versionHash,573:participantsHash,
 3036:short('Experimental DPA Formation'),3080:short('1'),3130:addr(formation),3172:toHex(BigInt(chainId),{size:32}),3214:hashDomain({domain:{name:'Experimental DPA Formation',version:'1',chainId:BigInt(chainId),verifyingContract:formation},types:{EIP712Domain:[{name:'name',type:'string'},{name:'version',type:'string'},{name:'chainId',type:'uint256'},{name:'verifyingContract',type:'address'}]}}),3295:keccak256(stringToHex('Experimental DPA Formation')),3335:keccak256(stringToHex('1'))};
 const repeated:Record<number,number[]>={701:[1319,1563,1929],761:[2691],271:[1815],329:[1853],573:[1891]};
 const refs=Object.values(formationArtifact.immutableReferences) as {start:number;length:number}[][];
 const offsets=refs.flatMap(r=>r.map(x=>x.start)).sort((a,b)=>a-b);
 const expected=Object.keys(values).map(Number).flatMap(x=>[x,...(repeated[x]??[])]).sort((a,b)=>a-b);
 if(JSON.stringify(offsets)!==JSON.stringify(expected)||refs.some(r=>r.some(x=>x.length!==32)))throw Error('Unexpected exclusive formation immutable layout');
 const code=await pub.getCode({address:formation});if(!code)throw Error('Formation absent');
 const reconstructed=runtimeWithOffsets(formationArtifact,refs.map(r=>{const offset=r[0].start,primary=Object.keys(values).map(Number).find(k=>k===offset||repeated[k]?.includes(offset));if(primary===undefined||r.some(x=>x.start!==primary&&!repeated[primary]?.includes(x.start)))throw Error('Immutable grouping mismatch');return {offsets:r.map(x=>x.start),value:values[primary]};}));
 if(reconstructed.toLowerCase()!==code.toLowerCase()){let at=0;while(at<code.length&&reconstructed[at]?.toLowerCase()===code[at]?.toLowerCase())at++;throw Error('Noncanonical exclusive formation at byte '+Math.floor((at-2)/2)+' expected '+reconstructed.slice(at,at+64)+' actual '+code.slice(at,at+64));}
 return {formation,issuer,factory,sdt,documentRef,version,people,shares:allocations,allocations,agreementHash,versionHash,participantsHash};
}
