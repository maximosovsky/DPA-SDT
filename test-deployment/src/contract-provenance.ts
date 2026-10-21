import {getAddress,hashDomain,keccak256,stringToHex,type Address, type Hex} from 'viem';
import sdt from '../artifacts/contracts/SDT.sol/SDT.json' with {type:'json'};
import dpa from '../artifacts/contracts/DPA.sol/DPA.json' with {type:'json'};
import {runtimeWithOffsets} from './immutable-runtime.ts';

// Match every byte of the compiled deployed runtime. EIP712's constructor immutables
// must be reconstructed rather than ignored: arbitrary wildcards would trust lookalikes.
function shortString(s:string):Hex {const bytes=stringToHex(s).slice(2);return `0x${bytes.padEnd(62,'0')}${(bytes.length/2).toString(16).padStart(2,'0')}`;}
function expectedDpa(address:Address,sdtAddress:Address,version:Hex,chainId:number):Hex {
 return runtimeWithOffsets(dpa,[
  {offsets:[105,1017,1440,1620],value:version},{offsets:[342,525,765,1055],value:sdtAddress},
  {offsets:[1865],value:shortString('Experimental DPA')},{offsets:[1914],value:shortString('1')},
  {offsets:[1964],value:address},{offsets:[2006],value:BigInt(chainId)},
  {offsets:[2048],value:hashDomain({domain:{name:'Experimental DPA',version:'1',chainId:BigInt(chainId),verifyingContract:address},types:{EIP712Domain:[{name:'name',type:'string'},{name:'version',type:'string'},{name:'chainId',type:'uint256'},{name:'verifyingContract',type:'address'}]}})},
  {offsets:[2129],value:keccak256(stringToHex('Experimental DPA'))},{offsets:[2169],value:keccak256(stringToHex('1'))}
 ]);
}
export function verifySdtCode(code:Hex|undefined):void {
 if(!code||code.toLowerCase()!==sdt.deployedBytecode.toLowerCase())throw Error('SDT code does not match compiled canonical runtime');
}
export function verifyDpaCode(code:Hex|undefined,address:Address,sdtAddress:Address,version:Hex,chainId:number):void {
 if(!code||code.toLowerCase()!==expectedDpa(getAddress(address),getAddress(sdtAddress),version,chainId).toLowerCase())throw Error('DPA code or immutable constructor values do not match compiled canonical runtime');
}
