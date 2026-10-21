import {test} from 'node:test';import assert from 'node:assert/strict';
import {keccak256,stringToHex} from 'viem';
import {makeOfferEvidence,verifyOfferEvidence} from '../src/offer-evidence.ts';
const hash=(s:string)=>keccak256(stringToHex(s));
const terms={seller:'0x1111111111111111111111111111111111111111',buyer:'0x2222222222222222222222222222222222222222',formation:'0x3333333333333333333333333333333333333333',collection:'0x4444444444444444444444444444444444444444',tokenId:3n,quantity:4000n,price:10000n,termsHash:hash('Exact synthetic terms'),withSDT:true,sellerSdtId:4n,sellerIdentityHash:hash('Alice'),buyerSdtId:5n,buyerIdentityHash:hash('Bob'),sellerNonce:0n,buyerNonce:0n,deadline:9999999999n};
test('offer evidence refuses blank, changed bytes and mismatched mode',()=>{
 const input={chainId:84532,formation:terms.formation,collection:terms.collection,sale:'0x5555555555555555555555555555555555555555',offerId:1n,status:1,terms};
 assert.throws(()=>makeOfferEvidence(input,'',true),/Exact terms/);
 assert.throws(()=>makeOfferEvidence(input,'Altered terms',true),/hash/);
 assert.throws(()=>makeOfferEvidence(input,'Exact synthetic terms',false),/mode/);
});
test('immutable UTF8 offer packet roundtrips and rejects altered text, context or signed terms',()=>{
 const input={chainId:84532,formation:terms.formation,collection:terms.collection,sale:'0x5555555555555555555555555555555555555555',offerId:1n,status:1,terms};
 const packet=makeOfferEvidence(input,'Exact synthetic terms',true);
 assert.equal(verifyOfferEvidence(packet,input).text,'Exact synthetic terms');
 assert.equal(verifyOfferEvidence(packet,input).termsHash,terms.termsHash);
 for(const altered of [{...packet,text:'Other'}, {...packet,chainId:1},{...packet,offerId:'2'},{...packet,terms:{...packet.terms,price:'10001'}},{...packet,mode:'without SDTs'}])assert.throws(()=>verifyOfferEvidence(altered,input),/mismatch|invalid|hash/i);
});
