import {test} from 'node:test';import assert from 'node:assert/strict';import hre from 'hardhat';
const {viem}=await hre.network.connect();
const h=`0x${'11'.repeat(32)}` as `0x${string}`,v=`0x${'22'.repeat(32)}` as `0x${string}`;
test('wrong chain, version, identity hash, token, signer and burned credential cannot accept; legitimate credential reused in another DPA',async()=>{
 const [a,b]=await viem.getWalletClients();const pub=await viem.getPublicClient();const s=await viem.deployContract('SDT');await s.write.mint([h],{account:a.account});await s.write.mint([h],{account:b.account});
 const d=await viem.deployContract('DPA',[s.address,v]);const d2=await viem.deployContract('DPA',[s.address,v]);const chainId=await pub.getChainId();
 const types={Accept:[{name:'wallet',type:'address'},{name:'agreementHash',type:'bytes32'},{name:'sdt',type:'address'},{name:'tokenId',type:'uint256'},{name:'identityHash',type:'bytes32'},{name:'nonce',type:'uint256'}]} as const;
 const domain={name:'Experimental DPA',version:'1',chainId,verifyingContract:d.address} as const;
 const message={wallet:a.account.address,agreementHash:v,sdt:s.address,tokenId:1n,identityHash:h,nonce:0n};
 for(const [signer,dom,msg] of [[a,{...domain,chainId:chainId+1},message],[a,domain,{...message,agreementHash:h}],[a,domain,{...message,identityHash:v}],[a,domain,{...message,tokenId:2n}],[b,domain,message]] as const){let sig=await signer.signTypedData({account:signer.account,domain:dom,types,primaryType:'Accept',message:msg});await assert.rejects(d.write.accept([a.account.address,1n,0n,sig],{account:a.account}));}
 assert.equal(await d.read.nonces([a.account.address]),0n);
 const sig=await a.signTypedData({account:a.account,domain,types,primaryType:'Accept',message});await d.write.accept([a.account.address,1n,0n,sig],{account:b.account});
 const sig2=await a.signTypedData({account:a.account,domain:{...domain,verifyingContract:d2.address},types,primaryType:'Accept',message});await d2.write.accept([a.account.address,1n,0n,sig2],{account:a.account});
 await s.write.burn([2n],{account:b.account});const bSig=await b.signTypedData({account:b.account,domain,types,primaryType:'Accept',message:{...message,wallet:b.account.address,tokenId:2n}});await assert.rejects(d.write.accept([b.account.address,2n,0n,bSig],{account:b.account}));
});
