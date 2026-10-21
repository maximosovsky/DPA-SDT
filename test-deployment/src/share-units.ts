import {getAddress,isAddress} from 'viem';

/** Percentage of the currently transferable balance, not percentage of the whole agreement. */
export function quoteOwnShare(owned:bigint,percentBps:bigint){
 if(owned<0n || percentBps<=0n || percentBps>10000n)throw Error('invalid percent or balance');
 const numerator=owned*percentBps,units=numerator/10000n;
 if(units===0n)throw Error('collateral rounds to zero');
 return {units,remainder:numerator%10000n,wholeAgreementBps:units};
}
export function quoteRepayment(principal:bigint,interestBps:bigint){
 if(principal<=0n||interestBps<0n||interestBps>10000n)throw Error('invalid interest or principal');
 return principal+(principal*interestBps+9999n)/10000n;
}
export const unitsAbi=[
 {type:'function',name:'balanceOf',stateMutability:'view',inputs:[{name:'account',type:'address'},{name:'id',type:'uint256'}],outputs:[{type:'uint256'}]},
 {type:'function',name:'formation',stateMutability:'view',inputs:[],outputs:[{type:'address'}]},
 {type:'function',name:'setApprovalForAll',stateMutability:'nonpayable',inputs:[{name:'operator',type:'address'},{name:'approved',type:'bool'}],outputs:[]},
 {type:'function',name:'safeTransferFrom',stateMutability:'nonpayable',inputs:[{name:'from',type:'address'},{name:'to',type:'address'},{name:'id',type:'uint256'},{name:'amount',type:'uint256'},{name:'data',type:'bytes'}],outputs:[]},
 {type:'function',name:'claim',stateMutability:'nonpayable',inputs:[],outputs:[{type:'uint256'}]}
] as const;
export const loanAbi=[
 {type:'function',name:'units',stateMutability:'view',inputs:[],outputs:[{type:'address'}]},
 {type:'function',name:'positions',stateMutability:'view',inputs:[{type:'uint256'}],outputs:[{name:'borrower',type:'address'},{name:'counterparty',type:'address'},{name:'collateral',type:'uint256'},{name:'percentBps',type:'uint256'},{name:'principal',type:'uint256'},{name:'interestBps',type:'uint256'},{name:'duration',type:'uint256'},{name:'deadline',type:'uint256'},{name:'status',type:'uint8'}]},
 {type:'function',name:'createPledge',stateMutability:'nonpayable',inputs:[{name:'counterparty',type:'address'},{name:'percentBps',type:'uint256'},{name:'duration',type:'uint256'}],outputs:[{type:'uint256'}]},
 {type:'function',name:'createLoan',stateMutability:'nonpayable',inputs:[{name:'lender',type:'address'},{name:'percentBps',type:'uint256'},{name:'principal',type:'uint256'},{name:'interestBps',type:'uint256'},{name:'duration',type:'uint256'}],outputs:[{type:'uint256'}]},
 ...(['fund','repay','cancelLoan','releasePledge','reclaimPledge','claimRepaidCollateral','claimDefault'] as const).map(name=>({type:'function' as const,name,stateMutability: (name==='fund'||name==='repay'?'payable':'nonpayable') as 'payable'|'nonpayable',inputs:[{name:'id',type:'uint256' as const}],outputs:[]})),
 {type:'function',name:'withdraw',stateMutability:'nonpayable',inputs:[],outputs:[]},
 {type:'function',name:'credits',stateMutability:'view',inputs:[{type:'address'}],outputs:[{type:'uint256'}]},
 {type:'function',name:'quoteCollateral',stateMutability:'view',inputs:[{type:'address'},{type:'uint256'}],outputs:[{type:'uint256'},{type:'uint256'}]},
 {type:'function',name:'repaymentAmount',stateMutability:'view',inputs:[{type:'uint256'}],outputs:[{type:'uint256'}]}
] as const;
export async function readPosition(client:{getChainId:()=>Promise<number>;getCode:(args:{address:`0x${string}`})=>Promise<`0x${string}`|undefined>;readContract:(args:any)=>Promise<unknown>},address:string,id:bigint,chainId:number,expectedUnits:string){
 if(await client.getChainId()!==chainId)throw Error('wrong chain');
 const code=isAddress(address)?await client.getCode({address:address as `0x${string}`}):undefined;
 if(!code || code==='0x' || !isAddress(expectedUnits))throw Error('missing contract');
 const units=await client.readContract({address:address as `0x${string}`,abi:loanAbi,functionName:'units'});
 if(typeof units!=='string'||getAddress(units)!==getAddress(expectedUnits))throw Error('wrong units contract');
 const position=await client.readContract({address:address as `0x${string}`,abi:loanAbi,functionName:'positions',args:[id]});
 return {units,position};
}
