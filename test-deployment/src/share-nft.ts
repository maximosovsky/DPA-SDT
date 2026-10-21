import {getAddress, type Address, type Hex, type PublicClient} from 'viem';
import artifact from '../artifacts/contracts/DPAShareNFT.sol/DPAShareNFT.json' with {type:'json'};
import {runtimeWithOffsets} from './immutable-runtime.ts';

function expectedRuntime(formation:Address, chainId:number):Hex {
 if(!Number.isSafeInteger(chainId)||chainId<=0)throw Error('Invalid chain ID');
 return runtimeWithOffsets(artifact,[
  {offsets:[397,1152,1435,1649,2115,2248,2613,2704,2842,3665,3756,3851],value:formation},
  {offsets:[594,2663,3715],value:BigInt(chainId)}
 ]);
}

/** Fail closed before presenting claim/sign actions; compiled artifact must be same pinned build. */
export function verifyShareNftCode(code:Hex|undefined,nft:Address,formation:Address,chainId:number):void {
 getAddress(nft);
 if(!code||code.toLowerCase()!==expectedRuntime(formation,chainId).toLowerCase())throw Error('Share NFT runtime or constructor immutables do not match canonical artifact');
}

/** Read actual code and constructor state on the expected network; verify formation separately. */
export async function preflightShareNft(client:PublicClient,nft:Address,formation:Address,chainId:number):Promise<void> {
 if(await client.getChainId()!==chainId)throw Error('Wrong chain');
 verifyShareNftCode(await client.getCode({address:nft}),nft,formation,chainId);
 const contractFormation=await client.readContract({address:nft,abi:artifact.abi,functionName:'formation'});
 const contractChain=await client.readContract({address:nft,abi:artifact.abi,functionName:'chainId'});
 if(getAddress(contractFormation as Address)!==getAddress(formation)||contractChain!==BigInt(chainId))throw Error('Share NFT constructor state mismatch');
 if(!await client.getCode({address:formation}))throw Error('Formation not deployed');
}
export const shareNftAbi=artifact.abi;
