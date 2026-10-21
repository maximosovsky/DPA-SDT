import {test} from 'node:test';import assert from 'node:assert/strict';import hre from 'hardhat';import {keccak256,stringToHex,encodeAbiParameters,parseAbiParameters} from 'viem';
const {viem}=await hre.network.connect();const id=keccak256(stringToHex('synthetic Alice'));
test('constructor freezes exact text/version/allocation and rejects invalid members',async()=>{
 const [a,b]=await viem.getWalletClients();const s=await viem.deployContract('SDT');
 for(const [people,shares] of [[[a.account.address],[100]],[[a.account.address,b.account.address],[0,100]],[[a.account.address,a.account.address],[50,50]],[[a.account.address,b.account.address],[40,40]]] as const)await assert.rejects(viem.deployContract('DPAFormation',[s.address,keccak256(stringToHex('hello')),'v1','',people,shares]));
 const d=await viem.deployContract('DPAFormation',[s.address,keccak256(stringToHex('hello')),'v1','',[a.account.address,b.account.address],[60,40]]);
 assert.equal(await d.read.agreementHash(),keccak256(stringToHex('hello')));assert.equal(await d.read.documentRef(),'');assert.equal(await d.read.version(),'v1');assert.deepEqual((await d.read.participants()).map(x=>x.toLowerCase()),[a.account.address,b.account.address].map(x=>x.toLowerCase()));assert.deepEqual(await d.read.shares(),[60,40]);
});
test('two different SDT holders sign one time each; replay and altered state fail; burn preserves snapshots',async()=>{
 const [a,b,c]=await viem.getWalletClients();const pub=await viem.getPublicClient();const s=await viem.deployContract('SDT');await s.write.mint([id],{account:a.account});await s.write.mint([keccak256(stringToHex('synthetic Bob'))],{account:b.account});
 const d=await viem.deployContract('DPAFormation',[s.address,keccak256(stringToHex('synthetic terms')),'v1','',[a.account.address,b.account.address],[60,40]]);const chainId=await pub.getChainId();
 const types={Accept:[{name:'wallet',type:'address'},{name:'agreementHash',type:'bytes32'},{name:'versionHash',type:'bytes32'},{name:'participantsHash',type:'bytes32'},{name:'sdt',type:'address'},{name:'tokenId',type:'uint256'},{name:'identityHash',type:'bytes32'},{name:'nonce',type:'uint256'}]} as const;
 const domain={name:'Experimental DPA Formation',version:'1',chainId,verifyingContract:d.address} as const;
 const textHash=keccak256(stringToHex('synthetic terms')),versionHash=keccak256(stringToHex('v1'));const participantsHash=keccak256(encodeAbiParameters(parseAbiParameters('address[], uint8[]'),[[a.account.address,b.account.address],[60,40]]));
 const message={wallet:a.account.address,agreementHash:textHash,versionHash,participantsHash,sdt:s.address,tokenId:1n,identityHash:id,nonce:0n};const sig=await a.signTypedData({account:a.account,domain,types,primaryType:'Accept',message});
 await assert.rejects(d.write.accept([c.account.address,1n,0n,sig]));await assert.rejects(d.write.accept([b.account.address,1n,0n,sig]));
 await d.write.accept([a.account.address,1n,0n,sig],{account:c.account});assert.equal(await d.read.complete(),false);await assert.rejects(d.write.accept([a.account.address,1n,0n,sig]));
 const bobHash=keccak256(stringToHex('synthetic Bob'));const sigB=await b.signTypedData({account:b.account,domain,types,primaryType:'Accept',message:{...message,wallet:b.account.address,tokenId:2n,identityHash:bobHash}});
 await d.write.accept([b.account.address,2n,0n,sigB]);assert.equal(await d.read.complete(),true);assert.equal(await d.read.acceptedCount(),2n);
 const snap=await d.read.acceptances([a.account.address]);await s.write.burn([1n],{account:a.account});assert.deepEqual(await d.read.acceptances([a.account.address]),snap);
});
