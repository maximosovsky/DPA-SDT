import { test } from 'node:test';
import assert from 'node:assert/strict';
import hre from 'hardhat';
const {viem}=await hre.network.connect();
test('SDT self mint, ERC5192, block transfer, historical burn, copied hashes',async()=>{
 const [a,b]=await viem.getWalletClients(); const s=await viem.deployContract('SDT'); const h=`0x${'12'.repeat(32)}` as `0x${string}`;
 await s.write.mint([h],{account:a.account});await s.write.mint([h],{account:b.account});
 assert.equal((await s.read.ownerOf([1n])).toLowerCase(),a.account.address.toLowerCase());assert.equal(await s.read.locked([1n]),true);
 assert.equal(await s.read.supportsInterface(['0xb45a3c0e']),true);
 await assert.rejects(s.write.transferFrom([a.account.address,b.account.address,1n],{account:a.account}));
 await assert.rejects(s.write.safeTransferFrom([a.account.address,b.account.address,1n],{account:a.account}));
 await assert.rejects(s.write.burn([1n],{account:b.account}));
 await s.write.burn([1n],{account:a.account});await assert.rejects(s.read.ownerOf([1n]));
 const r=await s.read.records([1n]);assert.equal(r[0].toLowerCase(),a.account.address.toLowerCase());assert.equal(r[1],h);assert.equal(r[3],true);
});
