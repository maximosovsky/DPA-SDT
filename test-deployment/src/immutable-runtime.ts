import {toHex,getAddress,type Address,type Hex} from 'viem';
/** Preserve complete compiler runtime, binding each immutable by reviewed byte offsets. */
export function runtimeWithOffsets(artifact:{deployedBytecode:string;immutableReferences:Record<string,{start:number;length:number}[]>},fields:{offsets:number[];value:Address|bigint|Hex}[]):Hex {
 const refs=Object.values(artifact.immutableReferences).flat();
 const actual=refs.map(ref=>ref.start).sort((a,b)=>a-b);
 const expected=fields.flatMap(field=>field.offsets).sort((a,b)=>a-b);
 if(JSON.stringify(actual)!==JSON.stringify(expected)||new Set(expected).size!==expected.length)throw Error('Unexpected immutable layout');
 const owners=new Map<number,string>();
 for(const field of fields)for(const offset of field.offsets)owners.set(offset,typeof field.value==='bigint'?toHex(field.value,{size:32}):field.value.length===42?toHex(BigInt(getAddress(field.value as Address)),{size:32}):field.value);
 let hex=artifact.deployedBytecode.slice(2);
 for(const group of Object.values(artifact.immutableReferences)){
  if(!group.length||group.some(ref=>owners.get(ref.start)!==owners.get(group[0].start)))throw Error('Mixed immutable reference group');
  for(const {start,length} of group){const word=owners.get(start)!;if(length!==32||word.length!==66||start<0||start*2+length*2>hex.length)throw Error('Unexpected immutable reference width');hex=hex.slice(0,start*2)+word.slice(2)+hex.slice((start+length)*2);}
 }
 return `0x${hex}`;
}
