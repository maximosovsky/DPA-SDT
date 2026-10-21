import {test} from 'node:test';import assert from 'node:assert/strict';import hre from 'hardhat';
import {keccak256,stringToHex} from 'viem';
import {verifyExclusiveFormationCode} from '../src/exclusive-formation-provenance.ts';
import {verifyExclusivePackage} from '../src/exclusive-package-provenance.ts';
const {viem}=await hre.network.connect();
test('exclusive factory, formation and issuer exact runtime/linkage must all match',async()=>{
 const [a,b]=await viem.getWalletClients(),pub=await viem.getPublicClient(),sdt=await viem.deployContract('SDT'),factory=await viem.deployContract('ExclusivePackageFactory');
 await factory.write.create([sdt.address,keccak256(stringToHex('terms')),'v2','',[a.account.address,b.account.address],[60,40]]);
 const ev=(await pub.getContractEvents({address:factory.address,abi:factory.abi,eventName:'Created'}))[0].args;
 await verifyExclusiveFormationCode(pub,ev.formation!,factory.address,ev.collection!,sdt.address,await pub.getChainId());
 await verifyExclusivePackage(pub,ev.collection!,ev.formation!,await pub.getChainId());
 await assert.rejects(verifyExclusiveFormationCode(pub,ev.formation!,a.account.address,ev.collection!,sdt.address,await pub.getChainId()));
 await assert.rejects(verifyExclusivePackage(pub,ev.collection!,sdt.address,await pub.getChainId()));
});
