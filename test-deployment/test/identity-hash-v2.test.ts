import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SYNTHETIC_FIXTURE} from '../src/synthetic-fixture.ts';
import {identityHashV2,canonicalIdentityV2,IDENTITY_V2_FIELDS,IDENTITY_V2_DOMAIN,exportIdentityEvidenceV2,verifyIdentityEvidenceV2} from '../src/identity-hash-v2.ts';
const fields={...SYNTHETIC_FIXTURE};
const vector='0x07d5740876b148d66ba3b757bee50b6386a9e99026760c00a2e4d536e3b9141d';
test('independent SHA256 UTF8 13-field vector',()=>{
 assert.equal(IDENTITY_V2_FIELDS.length,13);
 assert.equal(identityHashV2(fields),vector);
 assert.equal(new TextDecoder().decode(canonicalIdentityV2(fields).slice(0,IDENTITY_V2_DOMAIN.length)),'cryptopassport:SDT:identity:v2\0');
});
test('each original identity and bank trace field commits to exact input',()=>{
 for(const key of IDENTITY_V2_FIELDS) assert.notEqual(identityHashV2({...fields,[key]:key==='dateOfBirth'?'03.03.1990':fields[key]+'x'}),vector,key);
});
test('serialization is ordered, field-named, unambiguous and rejects omissions or extras',()=>{
 assert.equal(identityHashV2(Object.fromEntries(Object.entries(fields).reverse()) as typeof fields),vector);
 const a={...fields,bankName:'x|y',bankBic:'z'};
 const b={...fields,bankName:'x',bankBic:'y|z'};
 assert.notEqual(identityHashV2(a),identityHashV2(b));
 const missing={...fields} as Record<string,string>;delete missing.bankAmount;
 assert.throws(()=>identityHashV2(missing),/bankAmount/);
 assert.throws(()=>identityHashV2({...fields,undeclared:'value'}),/undeclared/);
 assert.throws(()=>identityHashV2({...fields,bankName:'\uD800'}),/bankName/);
 assert.throws(()=>identityHashV2({...fields,bankName:''}),/bankName/);
});
test('local evidence roundtrip records exact schema and catches tampering',()=>{
 const raw=exportIdentityEvidenceV2(fields);
 const record=JSON.parse(raw);
 assert.equal(record.schema,'cryptopassport-sdt-identity-evidence-v2');
 assert.equal(record.version,2);assert.equal(record.algorithm,'SHA-256');
 assert.deepEqual(record.hashBoundFields,IDENTITY_V2_FIELDS);
 assert.equal(record.digest,vector);assert.deepEqual(record.fields,fields);
 assert.equal(verifyIdentityEvidenceV2(raw),vector);
 assert.throws(()=>verifyIdentityEvidenceV2(JSON.stringify({...record,fields:{...fields,bankAmount:'101.00'}})),/digest/i);
 assert.throws(()=>verifyIdentityEvidenceV2(JSON.stringify({...record,version:1})),/version/i);
});
