import {getAddress,type Address,type Hex,type PublicClient} from 'viem';
import nftArtifact from '../artifacts/contracts/DPAPackageNFT.sol/DPAPackageNFT.json' with {type:'json'};
import saleArtifact from '../artifacts/contracts/DPAPackageSale.sol/DPAPackageSale.json' with {type:'json'};
import loanArtifact from '../artifacts/contracts/DPAPackageLoan.sol/DPAPackageLoan.json' with {type:'json'};
import {runtimeWithOffsets} from './immutable-runtime.ts';
export const packageAbi=nftArtifact.abi;
export const packageSaleAbi=saleArtifact.abi;
export const packageLoanAbi=loanArtifact.abi;
function read(pub:PublicClient,address:Address,abi:any,functionName:string){return pub.readContract({address,abi,functionName} as any);}
function immutableRuntime(artifact:any,values:(Address|bigint)[],code:Hex){
 const refs=Object.values(artifact.immutableReferences) as {start:number;length:number}[][];
 if(refs.length!==values.length||refs.some(r=>r.some(x=>x.length!==32)))throw Error('Unexpected package immutable layout');
 const expected=runtimeWithOffsets(artifact,refs.map((r,i)=>({offsets:r.map(x=>x.start),value:values[i]})));
 if(code?.toLowerCase()!==expected.toLowerCase())throw Error('Noncanonical package code');
}
export async function verifyPackage(pub:PublicClient,collection:Address,formation:Address,chainId:number){
 if(await pub.getChainId()!==chainId)throw Error('Wrong chain');
 const code=await pub.getCode({address:collection});if(!code)throw Error('Collection absent');
 const linked=await read(pub,collection,packageAbi,'formation') as Address;
 const deployed=await read(pub,collection,packageAbi,'chainId') as bigint;
 if(getAddress(linked)!==getAddress(formation)||deployed!==BigInt(chainId))throw Error('Package linkage mismatch');
 immutableRuntime(nftArtifact,[formation,BigInt(chainId)],code);
}
export async function verifyPackageOperator(pub:PublicClient,kind:'sale'|'loan',address:Address,collection:Address,sdt?:Address){
 const artifact=kind==='sale'?saleArtifact:loanArtifact,code=await pub.getCode({address});if(!code)throw Error('Operator absent');
 const linked=await read(pub,address,artifact.abi,'collection') as Address;
 if(getAddress(linked)!==getAddress(collection))throw Error('Operator collection mismatch');
 if(kind==='sale'){
  if(!sdt||getAddress(await read(pub,address,packageSaleAbi,'sdt') as Address)!==getAddress(sdt))throw Error('Sale SDT mismatch');
  immutableRuntime(artifact,[collection,sdt],code);
 } else immutableRuntime(artifact,[collection],code);
}
