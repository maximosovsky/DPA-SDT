import {keccak256,toHex,type Hex} from 'viem';
/** Match the immutable agreement commitment against exact bytes, not a normalized string. */
export function verifyDocumentBytes(bytes:Uint8Array,expected:Hex):Hex {
 const hash=keccak256(toHex(bytes));
 if(hash.toLowerCase()!==expected.toLowerCase())throw Error('Off-chain agreement bytes mismatch');
 return hash;
}
