import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {identityHashV2} from '../src/identity-hash-v2.ts';
import {SYNTHETIC_FIXTURE} from '../src/synthetic-fixture.ts';
import {requireSyntheticBankTrace, SYNTHETIC_BANK_TRACE} from '../client/bank-trace.ts';
const read=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
test('banking documentary trace is visibly structured and BIC not IBAN',()=>{
 const html=read('index.html');
 for(const id of ['bankTransactionId','bankName','bankBic','bankAccountNumber','bankDate','bankTime','bankTimezone','bankAmount','bankCurrency','bankRecipient']) assert.match(html,new RegExp(`id="${id}"`));
 for(const phrase of ['Transaction number','Bank name','SWIFT/BIC','Account number','Transaction date','Transaction time','Time zone','Transaction amount','Currency','Recipient','not independently verified','SDT v2']) assert.ok(html.includes(phrase),phrase);
 assert.doesNotMatch(html,/IBAN/);
});
test('SDT bank form is concise and the technical, export, and safety disclosures stay in context',()=>{
 const html=read('index.html');
 const research=html.split('<details class="research">')[1].split('</details>')[0];
 const form=html.split('<div class="bank-trace">')[1].split('<label>Transaction number')[0];
 const exportSection=html.split('<h2>Private evidence export</h2>')[1].split('</section>')[0];
 assert.match(form,/<h3>Bank transaction details<\/h3>/);
 assert.match(form,/Use synthetic test data only\. All entered fields are included in the SDT hash\./);
 assert.match(form,/Only the predefined synthetic test values below are accepted\./);
 assert.doesNotMatch(form,/fictional fixture|Historical SDT v1|plaintext locally/);
 assert.match(research,/New SDT v2 hashes bind all 13 exact entered synthetic fields/);
 // Historical four-field limits now live in the substantive Terms, not the concise form.
 assert.match(read('terms.html'), /Historical hashes commit only to four fields; do not reinterpret old records as thirteen-field declarations/);
 assert.match(research,/not independently verified and do not establish that a bank or transfer exists/);
 assert.match(html.split('<details id="sdt-tools">')[1],/Never enter real identity or banking details/);
 assert.match(exportSection,/<button id="export">Export synthetic fields locally<\/button><p>Export contains plaintext synthetic inputs/);
 assert.match(exportSection,/a hash is not encryption or a backup/i);
 assert.doesNotMatch(exportSection,/all 13 exact entered synthetic fields/);
});
test('bank trace is a finite fictional fixture, not a prefix or editable real data',()=>{
 assert.doesNotThrow(()=>requireSyntheticBankTrace(SYNTHETIC_BANK_TRACE));
 for(const key of Object.keys(SYNTHETIC_BANK_TRACE)) assert.throws(()=>requireSyntheticBankTrace({...SYNTHETIC_BANK_TRACE,[key]:`${SYNTHETIC_BANK_TRACE[key]}X`}),/exact synthetic/i);
});
test('client commits all 13 fields to v2',()=>{
 assert.equal(identityHashV2(SYNTHETIC_FIXTURE),identityHashV2(SYNTHETIC_FIXTURE));
 const client=read('client/main.ts');
 assert.match(client,/identityHashV2/);
 assert.match(client,/exportIdentityEvidenceV2/);
 assert.match(client,/bankTransactionId/);
});
