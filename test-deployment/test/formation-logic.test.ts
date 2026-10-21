import {test} from 'node:test';import assert from 'node:assert/strict';import {draft,invitationAddress,formationTypedData} from '../src/formation.ts';
const a='0x1234567890123456789012345678901234567890', b='0x2345678901234567890123456789012345678901';
test('draft enforces synthetic acknowledgement, complete and unique shares, stable ordered digest',()=>{
 assert.throws(()=>draft('hello','v1',[a,b],['50','50'],false),/acknowledge/i);
 for(const shares of [['0','100'],['50','49'],['50.5','49.5'],['-1','101']])assert.throws(()=>draft('hello','v1',[a,b],shares,true));
 assert.throws(()=>draft('hello','v1',[a,a],['50','50'],true),/duplicate/i);
 assert.throws(()=>draft('hello','v1',[a],['100'],true),/two/i);
 assert.throws(()=>draft('','v1',[a,b],['50','50'],true));assert.throws(()=>draft('hello','',[a,b],['50','50'],true));
 assert.throws(()=>draft('hello','v1',[a,'bad'],['50','50'],true));
 const d=draft('hello','v1',[a,b],['60','40'],true);
 assert.equal(d.participantsHash,draft('hello','v1',[a,b],['60','40'],true).participantsHash);
 assert.notEqual(d.participantsHash,draft('hello','v1',[b,a],['40','60'],true).participantsHash);
 assert.notEqual(d.textHash,draft('hello!','v1',[a,b],['60','40'],true).textHash);
});
test('invitation permits only checksummed contract address on chain 84532 or local 31337',()=>{
 assert.equal(invitationAddress('?agreement='+a+'&chain=84532','example.com')?.toLowerCase(),a.toLowerCase());
 assert.equal(invitationAddress('?agreement='+a+'&chain=31337','localhost')?.toLowerCase(),a.toLowerCase());
 for(const q of ['?agreement='+a+'&chain=1','?agreement='+a+'&chain=84532&agreement='+b,'?agreement=evil&chain=84532','?agreement='+a+'&chain=84532&text=forged'])assert.equal(invitationAddress(q,'example.com'),null);
 assert.equal(invitationAddress('?agreement='+a+'&chain=31337','example.com'),null);
});
test('typed acceptance includes deployment, chain, SDT, text/version, ordered allocation, token identity and nonce',()=>{
 const d=draft('hello','v1',[a,b],['60','40'],true);
 const t=formationTypedData(84532,a,b,a,d.textHash,d.versionHash,d.participantsHash,1n,d.textHash,0n);
 assert.equal(t.message.participantsHash,d.participantsHash);assert.equal(t.domain.verifyingContract,a);assert.equal(t.message.wallet,b);assert.equal(t.message.nonce,0n);
});
