import {keccak256,stringToHex,type Address,type Hex} from 'viem';
import {draft,type Draft} from './formation.ts';
export type Evidence={format:'dpa-formation-evidence-v1';text:string;version:string;people:Address[];shares:number[];agreementHash:Hex;versionHash:Hex;participantsHash:Hex};
export function documentReference(value:string):string {
 if(!value)return '';
 if(value.length>200)throw Error('Document reference too long');
 if(/^ipfs:\/\/[a-zA-Z0-9]+$/.test(value))return value;
 try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.hostname&&value===u.href)return value}catch{}
 throw Error('Use a plain HTTPS URL without query/fragment/credentials or ipfs://CID');
}
export function exportEvidence(value:Draft):string{return JSON.stringify({format:'dpa-formation-evidence-v1',text:value.text,version:value.version,people:value.people,shares:value.shares,agreementHash:value.textHash,versionHash:value.versionHash,participantsHash:value.participantsHash},null,2)+'\n'}
export function importEvidence(raw:string):Evidence {
 if(new TextEncoder().encode(raw).length>100000)throw Error('Evidence too large');
 const e=JSON.parse(raw);if(!e||e.format!=='dpa-formation-evidence-v1'||typeof e.text!=='string'||typeof e.version!=='string'||!Array.isArray(e.people)||!Array.isArray(e.shares))throw Error('Invalid evidence format');
 const d=draft(e.text,e.version,e.people,e.shares.map(String),true);
 if(e.agreementHash!==d.textHash||e.versionHash!==d.versionHash||e.participantsHash!==d.participantsHash)throw Error('Evidence digest mismatch');
 return e as Evidence;
}
export function verifyEvidence(raw:string,record:{agreementHash:Hex;version:string;people:Address[];shares:number[];documentRef:string}):Evidence {
 const e=importEvidence(raw);if(e.agreementHash!==record.agreementHash||e.version!==record.version||JSON.stringify(e.people.map(p=>p.toLowerCase()))!==JSON.stringify(record.people.map(p=>p.toLowerCase()))||JSON.stringify(e.shares)!==JSON.stringify(record.shares))throw Error('Evidence does not match formation contract');
 return e;
}
export function verifyDocumentText(text:string,hash:Hex):void {if(keccak256(stringToHex(text))!==hash)throw Error('Agreement bytes do not match on-chain hash')}
