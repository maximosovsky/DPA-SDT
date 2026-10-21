import {encodeAbiParameters,parseAbiParameters,getAddress,isAddress,keccak256,stringToHex,type Address,type Hex} from 'viem';
export type Draft={text:string;version:string;people:Address[];shares:number[];textHash:Hex;versionHash:Hex;participantsHash:Hex};
export function draft(text:string,version:string,people:string[],values:string[],acknowledged:boolean):Draft {
 if(!acknowledged)throw Error('Acknowledge synthetic-only testnet publication first');
 if(!text.trim()||!version.trim()||text.length>16000||version.length>120)throw Error('Text/version missing or too long');
 if(people.length<2||people.length>100||people.length!==values.length)throw Error('At least two participants required (maximum 100)');
 if(people.some(p=>!isAddress(p)))throw Error('Invalid participant address');
 const normalized=people.map(p=>getAddress(p));if(new Set(normalized.map(p=>p.toLowerCase())).size!==people.length)throw Error('Duplicate participant');
 const shares=values.map(v=>{if(!/^(?:[1-9]|[1-9][0-9]|100)$/.test(v))throw Error('Share must be a positive whole percent');return Number(v)});
 if(shares.reduce((a,b)=>a+b,0)!==100)throw Error('Shares must total 100%');
 return {text,version,people:normalized,shares,textHash:keccak256(stringToHex(text)),versionHash:keccak256(stringToHex(version)),participantsHash:keccak256(encodeAbiParameters(parseAbiParameters('address[], uint8[]'),[normalized,shares]))};
}
export function invitationAddress(query:string,hostname:string):Address|null {
 const p=new URLSearchParams(query);if([...p.keys()].some(k=>!['agreement','chain'].includes(k))||p.getAll('agreement').length!==1||p.getAll('chain').length!==1)return null;
 const chain=p.get('chain');if(chain!=='84532'&&!(chain==='31337'&&['localhost','127.0.0.1'].includes(hostname)))return null;
 const value=p.get('agreement')!;return isAddress(value)?getAddress(value):null;
}
export function formationTypedData(chainId:number,verifyingContract:Address,wallet:Address,sdt:Address,agreementHash:Hex,versionHash:Hex,participantsHash:Hex,tokenId:bigint,identityHash:Hex,nonce:bigint){
 return {domain:{name:'Experimental DPA Formation',version:'1',chainId,verifyingContract},types:{Accept:[{name:'wallet',type:'address'},{name:'agreementHash',type:'bytes32'},{name:'versionHash',type:'bytes32'},{name:'participantsHash',type:'bytes32'},{name:'sdt',type:'address'},{name:'tokenId',type:'uint256'},{name:'identityHash',type:'bytes32'},{name:'nonce',type:'uint256'}]},primaryType:'Accept',message:{wallet,agreementHash,versionHash,participantsHash,sdt,tokenId,identityHash,nonce}} as const;
}
