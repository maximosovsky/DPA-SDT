import {sha256,toBytes} from 'viem';
export const SYNTHETIC_AGREEMENT='SYNTHETIC AGREEMENT v1: A 60%; B 40%. No actual rights or payment.';
export function agreementHash(text:string){if(!text.length)throw Error('Empty agreement');return sha256(toBytes(text));}
export function acceptanceTypedData(chainId:number,verifyingContract:`0x${string}`,wallet:`0x${string}`,sdt:`0x${string}`,versionHash:`0x${string}`,tokenId:bigint,identityHash:`0x${string}`,nonce:bigint){
 return {domain:{name:'Experimental DPA',version:'1',chainId,verifyingContract},types:{Accept:[{name:'wallet',type:'address'},{name:'agreementHash',type:'bytes32'},{name:'sdt',type:'address'},{name:'tokenId',type:'uint256'},{name:'identityHash',type:'bytes32'},{name:'nonce',type:'uint256'}]},primaryType:'Accept',message:{wallet,agreementHash:versionHash,sdt,tokenId,identityHash,nonce}} as const;
}
