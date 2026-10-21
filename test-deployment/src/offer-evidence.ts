import {keccak256,stringToHex} from 'viem';
type Context={chainId:number;formation:string;collection:string;sale:string;offerId:bigint;status:number;terms:Record<string,unknown>};
const stringify=(v:unknown)=>JSON.stringify(v,(_,x)=>typeof x==='bigint'?x.toString():x,2);
const norm=(v:unknown)=>JSON.parse(stringify(v));
export function makeOfferEvidence(context:Context,text:string,withSDT:boolean){
 if(!text.trim())throw Error('Exact terms missing');
 if(keccak256(stringToHex(text))!==context.terms.termsHash)throw Error('Exact terms hash mismatch');
 if(withSDT!==context.terms.withSDT)throw Error('Sale mode mismatch');
 if(context.status!==1&&context.status!==2)throw Error('Offer state invalid');
 if(context.formation!==context.terms.formation||context.collection!==context.terms.collection)throw Error('Signed formation or collection mismatch');
 return Object.freeze({schema:'dpa-package-offer-evidence-v1',chainId:context.chainId,formation:context.formation,collection:context.collection,sale:context.sale,offerId:context.offerId.toString(),status:context.status,mode:withSDT?'with SDTs':'without SDTs',terms:norm(context.terms),termsHash:context.terms.termsHash,text});
}
export function verifyOfferEvidence(packet:any,context:Context){
 if(!packet||typeof packet.text!=='string'||!packet.text.trim())throw Error('Exact terms missing');
 const expected=makeOfferEvidence(context,packet.text,context.terms.withSDT as boolean);
 if(stringify(packet)!==stringify(expected))throw Error('Evidence context mismatch');
 return expected;
}
export function offerEvidenceJSON(packet:ReturnType<typeof makeOfferEvidence>){return stringify(packet)+'\n'}
