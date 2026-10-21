import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildReport,reportHtml} from '../src/historical-verify.ts';

const names=['index','index1','dpa','shares','sale','verify','privacy','terms','contact'];
test('all nine published pages avoid SDT v1 naming',()=>{
 for(const name of names){const html=readFileSync(new URL(`../${name}.html`,import.meta.url),'utf8');assert.doesNotMatch(html,/SDT[\\s-]+v1/i,name);}
});
test('thirteen-field report serialization',()=>{
 const fields={fullName:'A',dateOfBirth:'01.01.2000',passportNumber:'P',bankTransactionId:'T',bankName:'B',bankBic:'B',bankAccountNumber:'A',bankDate:'2026-01-01',bankTime:'00:00',bankTimezone:'UTC',bankAmount:'0',bankCurrency:'USD',bankRecipient:'R'};
 const report=buildReport({version:'v2',status:'matched'},fields,false);
 assert.equal(report.version,'v2');
 assert.doesNotMatch(JSON.stringify(report),/SDT[\\s-]+v1/i);
 assert.doesNotMatch(reportHtml(report),/SDT[\\s-]+v1/i);
 assert.match(report.serialization,/thirteen/i);
});