import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,viem} from './DPAShareUnits.test.ts';
async function ready(){const f=await fixture();await f.accept(f.alice,1n,f.ha);await f.accept(f.bob,2n,f.hb);await f.units.write.claim({account:f.alice.account});await f.units.write.claim({account:f.bob.account});const loan=await viem.deployContract('DPAShareLoan',[f.units.address]);await f.units.write.setApprovalForAll([loan.address,true],{account:f.bob.account});return {...f,loan};}
async function jump(f:Awaited<ReturnType<typeof ready>>, seconds:number){await f.pc.request({method:'evm_increaseTime',params:[seconds]});await f.pc.request({method:'evm_mine',params:[]});}
const principal=1_000_000_000_000_000n;
test('25% of borrower-owned 40% locks 1000 of whole 10000; transferability and remainder preserved',async()=>{
 const f=await ready();assert.deepEqual(await f.loan.read.quoteCollateral([f.bob.account.address,2500n]),[1000n,0n]);
 await f.loan.write.createPledge([f.alice.account.address,2500n,3600n],{account:f.bob.account});assert.equal(await f.units.read.balanceOf([f.bob.account.address,1n]),3000n);assert.equal(await f.units.read.balanceOf([f.loan.address,1n]),1000n);
 await f.units.write.safeTransferFrom([f.bob.account.address,f.carol.account.address,1n,500n,'0x'],{account:f.bob.account});
 await assert.rejects(f.loan.write.releasePledge([1n],{account:f.carol.account}));await assert.rejects(f.loan.write.releasePledge([1n],{account:f.bob.account}));
 await f.loan.write.releasePledge([1n],{account:f.alice.account});assert.equal(await f.units.read.balanceOf([f.bob.account.address,1n]),3500n);
});
test('standalone pledge expiration allows borrower recovery, not premature release; invalid percentages fail',async()=>{
 const f=await ready();await assert.rejects(f.loan.write.createPledge([f.alice.account.address,0n,60n],{account:f.bob.account}));await assert.rejects(f.loan.write.createPledge([f.alice.account.address,10001n,60n],{account:f.bob.account}));
 await f.loan.write.createPledge([f.alice.account.address,5000n,60n],{account:f.bob.account});await assert.rejects(f.loan.write.reclaimPledge([1n],{account:f.bob.account}));await jump(f,61);await f.loan.write.reclaimPledge([1n],{account:f.bob.account});assert.equal(await f.units.read.balanceOf([f.loan.address,1n]),0n);
});
test('funded test ETH loan locks terms; borrower withdraws principal, repays with interest, collateral and lender credits pull',async()=>{
 const f=await ready();await f.loan.write.createLoan([f.alice.account.address,2500n,principal,500n,3600n],{account:f.bob.account});await assert.rejects(f.loan.write.fund([1n],{account:f.alice.account,value:principal-1n}));await assert.rejects(f.loan.write.fund([1n],{account:f.carol.account,value:principal}));
 await f.loan.write.fund([1n],{account:f.alice.account,value:principal});assert.equal(await f.loan.read.credits([f.bob.account.address]),principal);
 await assert.rejects(f.loan.write.cancelLoan([1n],{account:f.bob.account}));await f.loan.write.withdraw({account:f.bob.account});assert.equal(await f.loan.read.credits([f.bob.account.address]),0n);
 await f.loan.write.repay([1n],{account:f.bob.account,value:principal+principal/20n});assert.equal(await f.loan.read.credits([f.alice.account.address]),principal+principal/20n);
 await assert.rejects(f.loan.write.claimDefault([1n],{account:f.alice.account}));await f.loan.write.claimRepaidCollateral([1n],{account:f.bob.account});await f.loan.write.withdraw({account:f.alice.account});assert.equal(await f.units.read.balanceOf([f.bob.account.address,1n]),4000n);assert.equal(await f.units.read.balanceOf([f.loan.address,1n]),0n);
});
test('rounding, no duplicate payment, unexpected collateral, and multiple escrow balances remain conserved',async()=>{
 const f=await ready();
 await assert.rejects(f.units.write.safeTransferFrom([f.bob.account.address,f.loan.address,1n,1n,'0x'],{account:f.bob.account}));
 for(const pct of [1n,3333n,9999n,10000n]){
  const before=await f.units.read.balanceOf([f.bob.account.address,1n]);
  if(before*pct<10000n){await assert.rejects(f.loan.write.createPledge([f.alice.account.address,pct,60n],{account:f.bob.account}));continue;}
  const amount=before*pct/10000n;const id=await f.loan.read.nextId();
  await f.loan.write.createPledge([f.alice.account.address,pct,60n],{account:f.bob.account});
  assert.equal(await f.units.read.balanceOf([f.bob.account.address,1n])+await f.units.read.balanceOf([f.loan.address,1n]),4000n);
  await f.loan.write.releasePledge([id],{account:f.alice.account});assert.equal(await f.units.read.balanceOf([f.bob.account.address,1n]),before);assert.ok(amount>0n);
 }
 const loanId=await f.loan.read.nextId();await f.loan.write.createLoan([f.alice.account.address,3333n,principal,1n,60n],{account:f.bob.account});assert.equal(await f.loan.read.repaymentAmount([loanId]),principal+100_000_000_000n);
 await f.loan.write.fund([loanId],{account:f.alice.account,value:principal});await f.loan.write.repay([loanId],{account:f.bob.account,value:principal+100_000_000_000n});
 await assert.rejects(f.loan.write.repay([loanId],{account:f.bob.account,value:principal+100_000_000_000n}));
 await f.loan.write.claimRepaidCollateral([loanId],{account:f.bob.account});
 assert.equal(await f.units.read.balanceOf([f.alice.account.address,1n])+await f.units.read.balanceOf([f.bob.account.address,1n])+await f.units.read.balanceOf([f.loan.address,1n]),10000n);
});
test('unfunded cancel returns escrow; funded default awards units only to lender after deadline',async()=>{
 const f=await ready();await f.loan.write.createLoan([f.alice.account.address,2500n,principal,0n,60n],{account:f.bob.account});await f.loan.write.cancelLoan([1n],{account:f.bob.account});await assert.rejects(f.loan.write.fund([1n],{account:f.alice.account,value:principal}));
 await f.loan.write.createLoan([f.alice.account.address,2500n,principal,0n,60n],{account:f.bob.account});await f.loan.write.fund([2n],{account:f.alice.account,value:principal});await assert.rejects(f.loan.write.claimDefault([2n],{account:f.alice.account}));await jump(f,61);await assert.rejects(f.loan.write.claimDefault([2n],{account:f.carol.account}));await assert.rejects(f.loan.write.repay([2n],{account:f.bob.account,value:principal}));await f.loan.write.claimDefault([2n],{account:f.alice.account});await assert.rejects(f.loan.write.claimDefault([2n],{account:f.alice.account}));assert.equal(await f.units.read.balanceOf([f.alice.account.address,1n]),7000n);assert.equal(await f.units.read.balanceOf([f.loan.address,1n]),0n);
});
