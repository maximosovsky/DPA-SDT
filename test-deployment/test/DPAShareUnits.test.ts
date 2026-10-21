import {test} from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import {keccak256,stringToHex} from 'viem';
const {viem}=await hre.network.connect();
async function fixture(){
 const [alice,bob,carol]=await viem.getWalletClients();const pc=await viem.getPublicClient();
 const sdt=await viem.deployContract('SDT');const ha=keccak256(stringToHex('synthetic A')),hb=keccak256(stringToHex('synthetic B'));
 await sdt.write.mint([ha],{account:alice.account});await sdt.write.mint([hb],{account:bob.account});
 const formation=await viem.deployContract('DPAFormation',[sdt.address,keccak256(stringToHex('synthetic terms')),'v1','',[alice.account.address,bob.account.address],[60,40]]);
 const units=await viem.deployContract('DPAShareUnits',[formation.address]);
 async function accept(w:typeof alice,id:bigint,hash:`0x${string}`){const nonce=await formation.read.nonces([w.account.address]);const signature=await w.signTypedData({account:w.account,domain:{name:'Experimental DPA Formation',version:'1',chainId:await pc.getChainId(),verifyingContract:formation.address},primaryType:'Accept',types:{Accept:[{name:'wallet',type:'address'},{name:'agreementHash',type:'bytes32'},{name:'versionHash',type:'bytes32'},{name:'participantsHash',type:'bytes32'},{name:'sdt',type:'address'},{name:'tokenId',type:'uint256'},{name:'identityHash',type:'bytes32'},{name:'nonce',type:'uint256'}]},message:{wallet:w.account.address,agreementHash:await formation.read.agreementHash(),versionHash:await formation.read.versionHash(),participantsHash:await formation.read.participantsHash(),sdt:sdt.address,tokenId:id,identityHash:hash,nonce}});await formation.write.accept([w.account.address,id,nonce,signature],{account:w.account});}
 return {alice,bob,carol,pc,sdt,formation,units,accept,ha,hb};
}
test('complete formation is prerequisite; each listed holder claims once, 10000 units conserved across transfers',async()=>{
 const f=await fixture();await assert.rejects(f.units.write.claim({account:f.alice.account}));await f.accept(f.alice,1n,f.ha);await assert.rejects(f.units.write.claim({account:f.alice.account}));await f.accept(f.bob,2n,f.hb);
 await assert.rejects(f.units.write.claim({account:f.carol.account}));await f.units.write.claim({account:f.alice.account});await f.units.write.claim({account:f.bob.account});
 assert.equal(await f.units.read.balanceOf([f.alice.account.address,1n]),6000n);assert.equal(await f.units.read.balanceOf([f.bob.account.address,1n]),4000n);assert.equal(await f.units.read.totalSupply(),10000n);await assert.rejects(f.units.write.claim({account:f.alice.account}));
 await f.units.write.safeTransferFrom([f.alice.account.address,f.carol.account.address,1n,2500n,'0x'],{account:f.alice.account});
 assert.equal(await f.units.read.balanceOf([f.carol.account.address,1n]),2500n);assert.equal(await f.units.read.balanceOf([f.alice.account.address,1n]),3500n);await assert.rejects(f.units.write.claim({account:f.carol.account}));
 const uri=await f.units.read.uri([1n]);const json=JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString());assert.match(json.image,/^data:image\/svg\+xml;base64,/);assert.match(JSON.stringify(json),/10000/);assert.ok(!JSON.stringify(json).includes('synthetic terms'));
 await assert.rejects(f.units.read.uri([2n]));
});
test('client own-balance quote floors explicitly and verifies chain and contract binding',async()=>{
 const {quoteOwnShare,quoteRepayment,readPosition}=await import('../src/share-units.ts');
 assert.deepEqual(quoteOwnShare(4000n,2500n),{units:1000n,remainder:0n,wholeAgreementBps:1000n});
 assert.deepEqual(quoteOwnShare(3333n,3333n),{units:1110n,remainder:8889n,wholeAgreementBps:1110n});
 assert.throws(()=>quoteOwnShare(3n,1n),/rounds to zero/);
 assert.throws(()=>quoteOwnShare(4000n,10001n),/percent/);
 assert.equal(quoteRepayment(101n,1n),102n);
 const expected='0x1111111111111111111111111111111111111111';
 const client={getChainId:async()=>31337,getCode:async()=> '0x6001',readContract:async({functionName}:{functionName:string})=>functionName==='units'?expected:1n};
 assert.deepEqual(await readPosition(client as never,expected,1n,31337,expected),{units:expected,position:1n});
 await assert.rejects(readPosition(client as never,expected,1n,84532,expected),/chain/);
 await assert.rejects(readPosition(client as never,expected,1n,31337,'0x2222222222222222222222222222222222222222'),/units/);
 await assert.rejects(readPosition({...client,getCode:async()=> '0x'} as never,expected,1n,31337,expected),/missing contract/);
});
export {fixture,viem};
