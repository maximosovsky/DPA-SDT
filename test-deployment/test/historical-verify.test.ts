import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identityHashV2} from '../src/identity-hash-v2.ts';
import {compareSnapshot,validateNetwork,buildReport,reportHtml,REPORT_TITLE} from '../src/historical-verify.ts';
const fields={fullName:'Synthetic Alice',dateOfBirth:'02.03.1990',passportNumber:'TEST-0001',bankTransactionId:'SYNTH-BANK-1',bankName:'Fictional Test Bank',bankBic:'TESTUS00XXX',bankAccountNumber:'TEST-ACCOUNT-0001',bankDate:'2026-01-15',bankTime:'12:30',bankTimezone:'UTC+00:00',bankAmount:'100.00',bankCurrency:'USD',bankRecipient:'Synthetic Recipient'};
const vector='0x07d5740876b148d66ba3b757bee50b6386a9e99026760c00a2e4d536e3b9141d';
test('independent SHA-256 v2 vector',()=>{
 assert.equal(identityHashV2(fields),vector);
 assert.notEqual(identityHashV2(fields),identityHashV2({...fields,fullName:' Synthetic Alice'}));
 assert.notEqual(identityHashV2({...fields,fullName:'é'}),identityHashV2({...fields,fullName:'e\u0301'}));
 for(const altered of [{...fields,fullName:''},{...fields,bankName:''},{...fields,dateOfBirth:'31.02.1990'},{...fields,bankTransactionId:'\ud800'}])assert.throws(()=>identityHashV2(altered));
});
test('snapshot matching and mismatching',()=>{
 const hash=identityHashV2(fields);
 assert.equal(compareSnapshot(hash,hash),'match');
 assert.equal(compareSnapshot(hash,'0x'+'a'.repeat(64)),'mismatch');
 assert.equal(compareSnapshot(hash,null),'unknown');
});
test('supported network is explicit, local chain only on local host',()=>{
 assert.equal(validateNetwork('84532','example.com'),84532);
 assert.equal(validateNetwork('31337','localhost'),31337);
 assert.throws(()=>validateNetwork('31337','example.com'));
 assert.throws(()=>validateNetwork('1','localhost'));
});
test('default reports omit PII, separately enabled reports escape HTML',()=>{
 const sample={fullName:'<script>alert(1)</script>',dateOfBirth:'02.03.1990',passportNumber:'X\"&',bankTransactionId:'PRIVATE_UNIQUE_XYZZY',bankName:'BANK_UNIQUE_XYZZY',bankBic:'BIC_UNIQUE_XYZZY',bankAccountNumber:'ACCT_UNIQUE_XYZZY',bankDate:'2099-12-31',bankTime:'23:59',bankTimezone:'MARS',bankAmount:'999999',bankCurrency:'ZZZ',bankRecipient:'RECIPIENT_UNIQUE_XYZZY'};
 const result={status:'matched',version:'v2',wallet:'0x123',checks:[],limitations:[]};
 const plain=buildReport(result,sample,false);
 const raw=JSON.stringify(plain);
 assert.equal(plain.title,REPORT_TITLE);
 for(const secret of Object.values(sample))assert.ok(!raw.includes(secret));
 const html=reportHtml(plain);
 assert.ok(!html.includes('<script>alert(1)</script>'));
 const included=buildReport(result,sample,true);
 assert.ok(reportHtml(included).includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.ok(!reportHtml(included).includes('<script>alert(1)</script>'));
});