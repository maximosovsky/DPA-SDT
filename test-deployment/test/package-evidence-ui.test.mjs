import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const code=()=>readFileSync(new URL('../client/packages.ts',import.meta.url),'utf8');
test('offer export verifies exact text and clears stale object URL on every relevant change',()=>{
 const s=code();assert.match(s,/makeOfferEvidence\(/);assert.match(s,/verifyOfferEvidence\(/);assert.match(s,/URL\.revokeObjectURL/);assert.match(s,/\['terms','price','buyer','seller-sdt','buyer-sdt','deadline'/);assert.match(s,/offerEvidenceJSON/);assert.match(s,/input.*invalidateOfferEvidence|invalidateOfferEvidence\(\)/);
});
