import {test} from 'node:test';import assert from 'node:assert/strict';import hre from 'hardhat';import {keccak256,stringToHex} from 'viem';import {verifyFormationCode} from '../src/formation-provenance.ts';import {documentReference,verifyDocumentText} from '../src/formation-document.ts';
const {viem}=await hre.network.connect();
test('formation canonical runtime binds SDT, exact text, version, ordered allocations and EIP712 domain',async()=>{
 const [a,b]=await viem.getWalletClients();const pub=await viem.getPublicClient();const s=await viem.deployContract('SDT');
 const args=[s.address,keccak256(stringToHex('synthetic public text')),'v1','',[a.account.address,b.account.address],[60,40]] as const;
 const d=await viem.deployContract('DPAFormation',args);const code=await pub.getCode({address:d.address});const chain=await pub.getChainId();
 await verifyFormationCode(pub,d.address,code!,s.address,chain);
 await assert.rejects(verifyFormationCode(pub,d.address,code!,'0x1234567890123456789012345678901234567890',chain));
 await assert.rejects(verifyFormationCode(pub,d.address,code!.slice(0,-4)+'0000' as `0x${string}`,s.address,chain));
 const other=await viem.deployContract('DPAFormation',[s.address,keccak256(stringToHex('changed')),'v1','',[a.account.address,b.account.address],[60,40]]);
 await assert.rejects(verifyFormationCode(pub,d.address,(await pub.getCode({address:other.address}))!,s.address,chain));
});
test('archived filename locator is readable but not valid for new records',async()=>{
 const [a,b]=await viem.getWalletClients();const pub=await viem.getPublicClient();const s=await viem.deployContract('SDT');
 const text='SYNTHETIC archival evidence',hash=keccak256(stringToHex(text));
 const f=await viem.deployContract('DPAFormation',[s.address,hash,'v1','synthetic-offchain-agreement.txt',[a.account.address,b.account.address],[60,40]]);
 const record=await verifyFormationCode(pub,f.address,(await pub.getCode({address:f.address}))!,s.address,await pub.getChainId());
 assert.equal(record.documentRef,'synthetic-offchain-agreement.txt');verifyDocumentText(text,record.agreementHash);
 assert.throws(()=>documentReference(record.documentRef));
});
test('fresh-compiled immutable identifiers still verify via byte offsets',async()=>{
 const refs=(await import('../artifacts/contracts/DPAFormation.sol/DPAFormation.json',{with:{type:'json'}})).default.immutableReferences;
 assert.ok(Object.keys(refs).some(id=>id!=='6040'),'fresh compiler identifiers differ from cached artifact');
 const [a,b]=await viem.getWalletClients(),pub=await viem.getPublicClient(),s=await viem.deployContract('SDT');
 const f=await viem.deployContract('DPAFormation',[s.address,keccak256(stringToHex('synthetic live terms')),'v1','',[a.account.address,b.account.address],[60,40]]);
 assert.equal((await verifyFormationCode(pub,f.address,(await pub.getCode({address:f.address}))!,s.address,await pub.getChainId())).agreementHash,await f.read.agreementHash());
});
