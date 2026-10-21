import {sha256,toBytes} from 'viem';
/** Calendar date validation (was shared with v1). */
export const IDENTITY_V2_FIELDS=['fullName','dateOfBirth','passportNumber','bankTransactionId','bankName','bankBic','bankAccountNumber','bankDate','bankTime','bankTimezone','bankAmount','bankCurrency','bankRecipient'] as const;
export type IdentityV2Fields=Record<(typeof IDENTITY_V2_FIELDS)[number],string>;
export const IDENTITY_V2_DOMAIN='cryptopassport:SDT:identity:v2\0';
export const IDENTITY_V2_CANONICALIZATION='UTF-8 exact input strings; fixed ordered field names; domain separator followed by uint32 big-endian field count, then uint32 big-endian byte length and UTF-8 bytes for each field name and value; no trimming, case folding, date/amount/time conversion or Unicode normalization';
const encoder=new TextEncoder();
function bytes(value:string,name:string):Uint8Array{
 if(typeof value!=='string'||!value.length||/\p{Cs}/u.test(value))throw Error(`Invalid ${name}`);
 const result=encoder.encode(value);
 if(result.length>0xffffffff)throw Error(`Oversized ${name}`);
 return result;
}
function length(value:number):Uint8Array{const out=new Uint8Array(4);new DataView(out.buffer).setUint32(0,value,false);return out;}
export function canonicalIdentityV2(fields:IdentityV2Fields):Uint8Array{
 if(!fields||typeof fields!=='object')throw Error('Invalid v2 fields');
 const keys=Object.keys(fields);
 for(const key of IDENTITY_V2_FIELDS)if(!Object.hasOwn(fields,key))throw Error(`Missing ${key}`);
 for(const key of keys)if(!(IDENTITY_V2_FIELDS as readonly string[]).includes(key))throw Error(`Unexpected ${key}`);
 // Calendar date validation
  {const date=fields.dateOfBirth;
   if(!/^(\d{2})\.(\d{2})\.(\d{4})$/.test(date))throw Error('Invalid DD.MM.YYYY date');
   const [,dd,mm,yyyy]=date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)!;
   const day=Number(dd),month=Number(mm),year=Number(yyyy);
   if(year===0||month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate())throw Error('Invalid calendar date');}
 const chunks:Uint8Array[]=[encoder.encode(IDENTITY_V2_DOMAIN),length(IDENTITY_V2_FIELDS.length)];
 for(const key of IDENTITY_V2_FIELDS){const k=bytes(key,key),v=bytes(fields[key],key);chunks.push(length(k.length),k,length(v.length),v);}
 const out=new Uint8Array(chunks.reduce((sum,part)=>sum+part.length,0));let offset=0;
 for(const part of chunks){out.set(part,offset);offset+=part.length;}
 return out;
}
export function identityHashV2(fields:IdentityV2Fields):`0x${string}`{return sha256(canonicalIdentityV2(fields));}
export function exportIdentityEvidenceV2(fields:IdentityV2Fields):string{
 const digest=identityHashV2(fields);
 return JSON.stringify({schema:'cryptopassport-sdt-identity-evidence-v2',version:2,algorithm:'SHA-256',canonicalization:IDENTITY_V2_CANONICALIZATION,domainSeparator:IDENTITY_V2_DOMAIN,hashBoundFields:IDENTITY_V2_FIELDS,fields:Object.fromEntries(IDENTITY_V2_FIELDS.map(key=>[key,fields[key]])),digest},null,2);
}
export function verifyIdentityEvidenceV2(raw:string):`0x${string}`{
 const record=JSON.parse(raw);
 if(record.schema!=='cryptopassport-sdt-identity-evidence-v2'||record.version!==2)throw Error('Invalid identity evidence version');
 if(record.algorithm!=='SHA-256'||record.canonicalization!==IDENTITY_V2_CANONICALIZATION||record.domainSeparator!==IDENTITY_V2_DOMAIN||JSON.stringify(record.hashBoundFields)!==JSON.stringify(IDENTITY_V2_FIELDS))throw Error('Invalid identity evidence schema');
 const digest=identityHashV2(record.fields);
 if(digest!==record.digest)throw Error('Identity evidence digest mismatch');
 return digest;
}
