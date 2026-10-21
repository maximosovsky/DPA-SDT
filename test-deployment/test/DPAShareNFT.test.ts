import {test} from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
import {getAddress, keccak256, stringToHex} from 'viem';
import {preflightShareNft, verifyShareNftCode} from '../src/share-nft.ts';

const {viem}=await hre.network.connect();
const identityA=keccak256(stringToHex('synthetic Alice'));
const identityB=keccak256(stringToHex('synthetic Bob'));
async function fixture(version='v1') {
 const [alice,bob,stranger]=await viem.getWalletClients();
 const publicClient=await viem.getPublicClient();
 const sdt=await viem.deployContract('SDT');
 await sdt.write.mint([identityA],{account:alice.account});
 await sdt.write.mint([identityB],{account:bob.account});
 const people=[alice.account.address,bob.account.address];
 const formation=await viem.deployContract('DPAFormation',[sdt.address,keccak256(stringToHex('synthetic agreement')),version,'',people,[60,40]]);
 const nft=await viem.deployContract('DPAShareNFT',[formation.address]);
 async function accept(wallet:typeof alice, tokenId:bigint,identityHash:`0x${string}`) {
  const nonce=await formation.read.nonces([wallet.account.address]);
  const signature=await wallet.signTypedData({account:wallet.account,
   domain:{name:'Experimental DPA Formation',version:'1',chainId:await publicClient.getChainId(),verifyingContract:formation.address},
   primaryType:'Accept',types:{Accept:[{name:'wallet',type:'address'},{name:'agreementHash',type:'bytes32'},{name:'versionHash',type:'bytes32'},{name:'participantsHash',type:'bytes32'},{name:'sdt',type:'address'},{name:'tokenId',type:'uint256'},{name:'identityHash',type:'bytes32'},{name:'nonce',type:'uint256'}]},
   message:{wallet:wallet.account.address,agreementHash:await formation.read.agreementHash(),versionHash:await formation.read.versionHash(),participantsHash:await formation.read.participantsHash(),sdt:sdt.address,tokenId,identityHash,nonce}});
  await formation.write.accept([wallet.account.address,tokenId,nonce,signature],{account:wallet.account});
 }
 return {alice,bob,stranger,publicClient,sdt,formation,nft,accept};
}
function decoded(uri:string) {
 assert.match(uri,/^data:application\/json;base64,/);
 return JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString('utf8'));
}
test('deployment rejects EOAs and incompatible contracts',async()=>{
 const {alice,sdt}=await fixture();
 await assert.rejects(viem.deployContract('DPAShareNFT',[alice.account.address]));
 await assert.rejects(viem.deployContract('DPAShareNFT',[sdt.address]));
});
test('claim requires complete acceptance, listed sender and one mint only',async()=>{
 const f=await fixture();
 await assert.rejects(f.nft.write.claim({account:f.alice.account}));
 await f.accept(f.alice,1n,identityA);
 await assert.rejects(f.nft.write.claim({account:f.alice.account}));
 await f.accept(f.bob,2n,identityB);
 await assert.rejects(f.nft.write.claim({account:f.stranger.account}));
 await f.nft.write.claim({account:f.alice.account});
 assert.equal(await f.nft.read.ownerOf([1n]),getAddress(f.alice.account.address));
 assert.equal(await f.nft.read.tokenOf([f.alice.account.address]),1n);
 await assert.rejects(f.nft.write.claim({account:f.alice.account}));
 await f.nft.write.claim({account:f.bob.account});
 assert.equal(await f.nft.read.ownerOf([2n]),getAddress(f.bob.account.address));
 assert.equal(await f.nft.read.totalClaimed(),2n);
});
test('all transfer and approval routes fail, including operator and burn-like zero recipient',async()=>{
 const f=await fixture();await f.accept(f.alice,1n,identityA);await f.accept(f.bob,2n,identityB);await f.nft.write.claim({account:f.alice.account});
 await assert.rejects(f.nft.write.transferFrom([f.alice.account.address,f.bob.account.address,1n],{account:f.alice.account}));
 await assert.rejects(f.nft.write.safeTransferFrom([f.alice.account.address,f.bob.account.address,1n],{account:f.alice.account}));
 await assert.rejects(f.nft.write.safeTransferFrom([f.alice.account.address,f.bob.account.address,1n,'0x'],{account:f.alice.account}));
 await assert.rejects(f.nft.write.transferFrom([f.alice.account.address,'0x0000000000000000000000000000000000000000',1n],{account:f.alice.account}));
 await assert.rejects(f.nft.write.approve([f.bob.account.address,1n],{account:f.alice.account}));
 await assert.rejects(f.nft.write.setApprovalForAll([f.bob.account.address,true],{account:f.alice.account}));
 await assert.rejects(f.nft.write.transferFrom([f.alice.account.address,f.bob.account.address,1n],{account:f.stranger.account}));
 assert.equal(await f.nft.read.ownerOf([1n]),getAddress(f.alice.account.address));
 assert.equal(await f.nft.read.locked([1n]),true);
 assert.equal(await f.nft.read.supportsInterface(['0xb45a3c0e']),true);
});
test('self-contained truthful metadata uses fixed safe alphabet and exact immutable record after SDT burn',async()=>{
 const f=await fixture('v1 <script>alert("x")</script> & ☃');
 await f.accept(f.alice,1n,identityA);await f.accept(f.bob,2n,identityB);
 await f.nft.write.claim({account:f.alice.account});await f.sdt.write.burn([1n],{account:f.alice.account});
 const uri=await f.nft.read.tokenURI([1n]);const json=decoded(uri);
 assert.equal(json.name,'DPA participation share');
 assert.equal(json.description,'Evidence of an accepted agreement allocation only; no automatic transfer of contractual rights or legal classification.');
 assert.equal(json.attributes.find((x:{trait_type:string})=>x.trait_type==='Share basis points').value,6000);
 assert.equal(json.attributes.find((x:{trait_type:string})=>x.trait_type==='Share percent').value,'60%');
 assert.equal(json.attributes.find((x:{trait_type:string})=>x.trait_type==='Wallet').value.toLowerCase(),f.alice.account.address.toLowerCase());
 assert.equal(json.attributes.find((x:{trait_type:string})=>x.trait_type==='Formation').value.toLowerCase(),f.formation.address.toLowerCase());
 assert.equal(json.attributes.find((x:{trait_type:string})=>x.trait_type==='Version hash').value,await f.formation.read.versionHash());
 assert.equal(json.attributes.find((x:{trait_type:string})=>x.trait_type==='Agreement hash').value,await f.formation.read.agreementHash());
 assert.equal(json.attributes.find((x:{trait_type:string})=>x.trait_type==='Chain ID').value,await f.publicClient.getChainId());
 assert.match(json.image,/^data:image\/svg\+xml;base64,/);
 const svg=Buffer.from(json.image.split(',')[1],'base64').toString('utf8');
 assert.match(svg,/<svg[^>]*xmlns="http:\/\/www.w3.org\/2000\/svg"/);
 assert.ok(svg.includes('60%'));assert.ok(svg.includes(f.alice.account.address.toLowerCase()));
 assert.ok(svg.includes(f.formation.address.toLowerCase()));
 assert.ok(svg.includes((await f.formation.read.agreementHash()).toLowerCase()));
 assert.ok(svg.includes((await f.formation.read.versionHash()).toLowerCase()));
 assert.ok(svg.includes(String(await f.publicClient.getChainId())));
 assert.ok(!svg.includes('<script'));assert.ok(!svg.includes('alert'));assert.ok(!svg.includes('synthetic Alice'));assert.ok(!JSON.stringify(json).includes('<script'));
 await assert.rejects(f.nft.read.tokenURI([99n]));await assert.rejects(f.nft.read.locked([99n]));
});
test('new version has separate address and independent claim; old token retains old agreement',async()=>{
 const f=await fixture();await f.accept(f.alice,1n,identityA);await f.accept(f.bob,2n,identityB);await f.nft.write.claim({account:f.alice.account});
 const next=await viem.deployContract('DPAFormation',[f.sdt.address,keccak256(stringToHex('revised synthetic terms')),'v2','',[f.alice.account.address,f.bob.account.address],[40,60]]);
 const other=await viem.deployContract('DPAShareNFT',[next.address]);
 await assert.rejects(other.write.claim({account:f.alice.account}));
 assert.equal(decoded(await f.nft.read.tokenURI([1n])).attributes.find((x:{trait_type:string})=>x.trait_type==='Share basis points').value,6000);
 assert.notEqual(await other.read.formation(),await f.nft.read.formation());
});
test('client provenance checks canonical runtime plus immutable formation and exact readbacks',async()=>{
 const f=await fixture();const chainId=await f.publicClient.getChainId();const code=await f.publicClient.getCode({address:f.nft.address});
 verifyShareNftCode(code,f.nft.address,f.formation.address,chainId);
 await preflightShareNft(f.publicClient,f.nft.address,f.formation.address,chainId);
 assert.throws(()=>verifyShareNftCode(code,f.nft.address,f.sdt.address,chainId));
 assert.throws(()=>verifyShareNftCode(code,f.nft.address,f.formation.address,chainId+1));
 assert.rejects(preflightShareNft(f.publicClient,f.formation.address,f.formation.address,chainId));
 assert.rejects(preflightShareNft(f.publicClient,f.nft.address,f.sdt.address,chainId));
});
