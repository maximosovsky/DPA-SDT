import {test} from 'node:test';import assert from 'node:assert/strict';import hre from 'hardhat';import {parseSignature} from 'viem';import {verifySdtCode,verifyDpaCode} from '../src/contract-provenance.ts';
const {viem}=await hre.network.connect();
const hash=`0x${'ab'.repeat(32)}` as `0x${string}`;const identity=`0x${'cd'.repeat(32)}` as `0x${string}`;
test('deployed SDT and DPA canonical runtimes and immutables verify, hostile changes fail',async()=>{
 const pub=await viem.getPublicClient();const s=await viem.deployContract('SDT');const d=await viem.deployContract('DPA',[s.address,hash]);const code=await pub.getCode({address:d.address});
 const chainId=await pub.getChainId();verifySdtCode(await pub.getCode({address:s.address}));verifyDpaCode(code,d.address,s.address,hash,chainId);
 assert.throws(()=>verifyDpaCode(code,d.address,s.address,`0x${'ba'.repeat(32)}`,chainId),/DPA code/);
});
test('DPA EIP712 binds wallet version deployment token chain and nonce; retains immutable snapshot after burn',async()=>{
 const [a,b,attacker]=await viem.getWalletClients();const pub=await viem.getPublicClient();const s=await viem.deployContract('SDT');
 await s.write.mint([identity],{account:a.account});const d=await viem.deployContract('DPA',[s.address,hash]);const other=await viem.deployContract('DPA',[s.address,hash]);
 const chainId=await pub.getChainId();const domain={name:'Experimental DPA',version:'1',chainId,verifyingContract:d.address} as const;
 const types={Accept:[{name:'wallet',type:'address'},{name:'agreementHash',type:'bytes32'},{name:'sdt',type:'address'},{name:'tokenId',type:'uint256'},{name:'identityHash',type:'bytes32'},{name:'nonce',type:'uint256'}]} as const;
 const msg={wallet:a.account.address,agreementHash:hash,sdt:s.address,tokenId:1n,identityHash:identity,nonce:0n};
 const sig=await a.signTypedData({account:a.account,domain,types,primaryType:'Accept',message:msg});
 await assert.rejects(d.write.accept([b.account.address,1n,0n,sig],{account:attacker.account}));
 await assert.rejects(d.write.accept([a.account.address,2n,0n,sig],{account:attacker.account}));
 await assert.rejects(other.write.accept([a.account.address,1n,0n,sig],{account:attacker.account}));
 await d.write.accept([a.account.address,1n,0n,sig],{account:attacker.account});
 await assert.rejects(d.write.accept([a.account.address,1n,0n,sig],{account:attacker.account}));
 const snap=await d.read.acceptances([a.account.address]);assert.equal(snap[0],1n);assert.equal(snap[1],identity);assert.equal(snap[2],hash);assert.equal(snap[4],1n);
 await s.write.burn([1n],{account:a.account});assert.deepEqual(await d.read.acceptances([a.account.address]),snap);
});
