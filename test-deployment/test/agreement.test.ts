import {test} from 'node:test';import assert from 'node:assert/strict';import {agreementHash,acceptanceTypedData} from '../src/agreement.ts';
test('synthetic agreement digest and typed payload preserve exact version/token/nonce',()=>{
 const text='SYNTHETIC AGREEMENT v1: A 60%; B 40%. No actual rights or payment.';
 const h=agreementHash(text);assert.match(h,/^0x[0-9a-f]{64}$/);
 const data=acceptanceTypedData(84532,`0x${'11'.repeat(20)}`,`0x${'22'.repeat(20)}`,`0x${'33'.repeat(20)}`,h,2n,`0x${'44'.repeat(32)}`,3n);
 assert.equal(data.domain.chainId,84532);assert.equal(data.message.tokenId,2n);assert.equal(data.message.nonce,3n);assert.equal(data.message.agreementHash,h);
});
