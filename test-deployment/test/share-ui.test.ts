import {test} from 'node:test';import assert from 'node:assert/strict';
import {runtimeWithOffsets} from '../src/immutable-runtime.ts';
import {parseBps,parseInterestBps,parsePositive,parseDuration,shareActions,canonicalRuntime} from '../src/share-ui.ts';
import units from '../artifacts/contracts/DPAShareUnits.sol/DPAShareUnits.json' with {type:'json'};
const borrower='0x0000000000000000000000000000000000000001',lender='0x0000000000000000000000000000000000000002';
test('exact percent, positive integer and duration validation',()=>{assert.equal(parseBps('25.25'),2525n);assert.equal(parseBps('100'),10000n);for(const x of ['0','100.01','1.234','NaN','-1',''])assert.throws(()=>parseBps(x));assert.equal(parsePositive('123'),123n);for(const x of ['0','1.1','1e5',''])assert.throws(()=>parsePositive(x));assert.equal(parseDuration('2'),172800n);assert.throws(()=>parseDuration('366'));});
test('loan interest accepts zero while collateral percentage cannot be zero',()=>{assert.equal(parseInterestBps('0'),0n);assert.equal(parseInterestBps('0.01'),1n);assert.throws(()=>parseInterestBps('100.01'));assert.throws(()=>parseBps('0'));});
test('role, state and deadline gate only executable actions',()=>{const p={borrower,counterparty:lender,collateral:1000n,percentBps:2500n,principal:100n,interestBps:500n,duration:60n,deadline:1000n,status:2};assert.deepEqual(shareActions(p,borrower,900n),['cancelLoan']);assert.deepEqual(shareActions(p,lender,900n),['fund']);assert.deepEqual(shareActions({...p,status:3},borrower,900n),['repay']);assert.deepEqual(shareActions({...p,status:3},lender,1001n),['claimDefault']);assert.deepEqual(shareActions({...p,status:4},borrower,900n),['claimRepaidCollateral']);assert.deepEqual(shareActions({...p,status:1},lender,900n),['releasePledge']);assert.deepEqual(shareActions({...p,status:1},borrower,1001n),['reclaimPledge']);assert.deepEqual(shareActions({...p,status:5},borrower,900n),[]);});
test('runtime reconstruction rejects lookalikes and unknown immutables',()=>{const a=canonicalRuntime(units,{'7861':borrower,'7863':31337n});assert.match(a,/^0x[0-9a-f]+$/i);assert.throws(()=>canonicalRuntime(units,{'7861':borrower}));assert.throws(()=>canonicalRuntime(units,{'7861':borrower,'7863':31337n,'other':borrower}));assert.notEqual(a,canonicalRuntime(units,{'7861':lender,'7863':31337n}));});
test('immutable layout rejects changed offsets, width, mixed groups and duplicate offsets',()=>{
 const artifact={deployedBytecode:`0x${'00'.repeat(128)}`,immutableReferences:{a:[{start:0,length:32},{start:32,length:32}],b:[{start:64,length:32}]}};
 const fields=[{offsets:[0,32],value:borrower},{offsets:[64],value:31337n}];
 assert.match(runtimeWithOffsets(artifact,fields),/^0x[0-9a-f]+$/i);
 assert.throws(()=>runtimeWithOffsets(artifact,[{offsets:[0,33],value:borrower},fields[1]]));
 assert.throws(()=>runtimeWithOffsets(artifact,[{offsets:[0,32,64],value:borrower},{offsets:[64],value:31337n}]));
 assert.throws(()=>runtimeWithOffsets({...artifact,immutableReferences:{a:[{start:0,length:32},{start:64,length:32}],b:[{start:32,length:32}]}},fields));
 assert.throws(()=>runtimeWithOffsets({...artifact,immutableReferences:{a:[{start:0,length:31},{start:32,length:32}],b:[{start:64,length:32}]}},fields));
});