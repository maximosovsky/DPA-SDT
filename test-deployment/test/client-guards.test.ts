import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getAddress} from 'viem';
import sdt from '../artifacts/contracts/SDT.sol/SDT.json' with {type:'json'};
import dpa from '../artifacts/contracts/DPA.sol/DPA.json' with {type:'json'};
import {requireSyntheticFixture} from '../src/synthetic-fixture.ts';
import {verifySdtCode,verifyDpaCode} from '../src/contract-provenance.ts';
import {SYNTHETIC_AGREEMENT,agreementHash} from '../src/agreement.ts';
const fixture={fullName:'Synthetic Alice',dateOfBirth:'02.03.1990',passportNumber:'TEST-0001',bankTransactionId:'SYNTH-BANK-1',bankName:'Fictional Test Bank',bankBic:'TESTUS00XXX',bankAccountNumber:'TEST-ACCOUNT-0001',bankDate:'2026-01-15',bankTime:'12:30',bankTimezone:'UTC+00:00',bankAmount:'100.00',bankCurrency:'USD',bankRecipient:'Synthetic Recipient'};
const address=getAddress('0x1234567890123456789012345678901234567890');
const sdtAddress=getAddress('0x2345678901234567890123456789012345678901');
const version=agreementHash(SYNTHETIC_AGREEMENT);
const chain=84532;
test('only exact fixture values accepted; deceptive prefixes and substitutions rejected',()=>{
 assert.doesNotThrow(()=>requireSyntheticFixture(fixture));
 for(const changed of [{fullName:'Synthetic Actual Person'},{passportNumber:'TEST-REAL-PASSPORT'},{bankTransactionId:'SYNTH-REAL-BANK'},{dateOfBirth:'03.03.1990'}])assert.throws(()=>requireSyntheticFixture({...fixture,...changed}),/fixture/i);
});
test('SDT only canonical deployed runtime is trusted',()=>{
 assert.doesNotThrow(()=>verifySdtCode(sdt.deployedBytecode));
 assert.throws(()=>verifySdtCode('0x'),/SDT|code/i);
 assert.throws(()=>verifySdtCode((sdt.deployedBytecode.slice(0,-2)+'00') as `0x${string}`),/SDT|code/i);
});
test('DPA rejects lookalikes and wrong immutable constructor values',()=>{
 assert.throws(()=>verifyDpaCode('0x',address,sdtAddress,version,chain),/DPA|code/i);
 assert.throws(()=>verifyDpaCode(dpa.deployedBytecode as `0x${string}`,address,sdtAddress,version,chain),/DPA|code/i);
});
