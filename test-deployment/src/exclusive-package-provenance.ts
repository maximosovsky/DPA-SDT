import {getAddress,type Address,type PublicClient} from 'viem';
import artifact from '../artifacts/contracts/DPAPackageNFTV2.sol/DPAPackageNFTV2.json' with {type:'json'};
import formationArtifact from '../artifacts/contracts/ExclusiveDPAFormation.sol/ExclusiveDPAFormation.json' with {type:'json'};
import {runtimeWithOffsets} from './immutable-runtime.ts';
export const exclusivePackageAbi=artifact.abi;
export async function verifyExclusivePackage(pub:PublicClient,collection:Address,formation:Address,chainId:number){
 if(await pub.getChainId()!==chainId)throw Error('Wrong chain');
 const code=await pub.getCode({address:collection});if(!code)throw Error('Collection absent');
 const linked=await pub.readContract({address:collection,abi:artifact.abi,functionName:'formation'} as any) as Address;
 const deployed=await pub.readContract({address:collection,abi:artifact.abi,functionName:'chainId'} as any) as bigint;
 if(getAddress(linked)!==getAddress(formation)||deployed!==BigInt(chainId))throw Error('Package linkage mismatch');
 const refs=Object.values(artifact.immutableReferences) as {start:number;length:number}[][];
 const offsets=refs.map(r=>r.map(x=>x.start));
 if(offsets.length!==2||JSON.stringify(offsets)!==JSON.stringify([[478,1438,1583,1812,1945,2159,4565],[744,4624]])||refs.some(r=>r.some(x=>x.length!==32)))throw Error('Unexpected package immutable layout');
 const expected=runtimeWithOffsets(artifact,[{offsets:offsets[0],value:formation},{offsets:offsets[1],value:BigInt(chainId)}]);
 if(code.toLowerCase()!==expected.toLowerCase())throw Error('Noncanonical exclusive package');
}
