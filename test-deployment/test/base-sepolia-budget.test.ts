import {test} from 'node:test';
import assert from 'node:assert/strict';
import {budgetAllows, assertExpectedRevert} from '../scripts/base-sepolia-safety.ts';

test('budget reserves all remaining operations and contingency before a transaction',()=>{
 assert.equal(budgetAllows(100_000n, [20_000n,30_000n], 2n),true);
 assert.equal(budgetAllows(99_999n, [20_000n,30_000n], 2n),false);
});
test('negative test requires a contract revert, not a transport failure',()=>{
 assert.doesNotThrow(()=>assertExpectedRevert({name:'ContractFunctionRevertedError',message:'reason: Nontransferable()'},/Nontransferable/));
 assert.throws(()=>assertExpectedRevert({name:'HttpRequestError',message:'503'},/Nontransferable/),/Not the expected contract revert/);
 assert.throws(()=>assertExpectedRevert({name:'ContractFunctionRevertedError',message:'reason: not holder'},/Nontransferable/),/Not the expected contract revert/);
});
