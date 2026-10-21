export function budgetAllows(balance:bigint, remainingMaximums:readonly bigint[], contingency:bigint):boolean {
 if(contingency<1n||remainingMaximums.some(x=>x<0n))throw Error('Invalid budget');
 return balance>=remainingMaximums.reduce((a,b)=>a+b,0n)*contingency;
}
export function assertExpectedRevert(error:unknown, reason:RegExp):void {
 const e=error as {name?:string;message?:string;walk?: (predicate:(e:{name?:string})=>boolean)=>unknown};
 const reverted=e?.name==='ContractFunctionRevertedError'||(typeof e?.walk==='function'&&!!e.walk(inner=>inner.name==='ContractFunctionRevertedError'));
 if(!reverted||!reason.test(String(e?.message)))throw Error(`Not the expected contract revert: ${String(e?.name)} ${String(e?.message)}`);
}
