// Read-only reconciliation of the published-UI synthetic Base Sepolia run.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createPublicClient,http,getAddress,decodeEventLog} from 'viem';
import {baseSepolia} from 'viem/chains';
import nftArtifact from '../artifacts/contracts/DPAPackageNFTV2.sol/DPAPackageNFTV2.json' with {type:'json'};
import loanArtifact from '../artifacts/contracts/DPAPackageLoan.sol/DPAPackageLoan.json' with {type:'json'};
import saleArtifact from '../artifacts/contracts/DPAPackageSale.sol/DPAPackageSale.json' with {type:'json'};
const dir='C:/Users/1/AppData/Local/hermes/cache/scratch/dpa-published-nine-20261019';
const e=JSON.parse(await readFile(dir+'/evidence.json','utf8'));
const pub=createPublicClient({chain:baseSepolia,transport:http('https://sepolia.base.org',{timeout:15000,retryCount:2})});
assert.equal(await pub.getChainId(),84532);
const eq=(a,b)=>assert.equal(getAddress(a),getAddress(b));
const read=(address,abi,functionName,args=[])=>pub.readContract({address,abi,functionName,args});
const statuses={};
const required={
  1:['1'],2:['2'],3:['3-alice','3-bob'],4:['4-alice','4-bob'],5:['5'],
  6:['6-transfer','6-sdt-offer','6-sdt','6-no-sdt-offer','6-no-sdt'],
  7:['operator-loan','7-pledge','7-release-new','7-offer','7-fund','7-borrower-withdraw','7-repay','7-recover','7-lender-withdraw','7-unfunded','7-unfunded-cancel'],
  8:['8'],9:['9']
};
for(const [n,parts] of Object.entries(required)){
  for(const part of parts){
    if(part==='8')assert.match(e.scenarios[part]?.status??'',/Current declaration.*matched/i);
    else assert.equal(e.scenarios[part]?.status,'passed',`scenario ${n} part ${part}`);
  }
  statuses[n]={status:'passed',subactions:parts};
}
assert.equal(e.transactions.length,new Set(e.transactions.map(x=>x.hash.toLowerCase())).size);
const receipts=[];
for(const row of e.transactions){
  const r=await pub.getTransactionReceipt({hash:row.hash});
  assert.equal(r.status,'success',row.hash);assert.equal(row.status,'success',row.hash);
  assert.equal(String(r.blockNumber),row.block,row.hash);
  eq(r.from,row.from);if(row.to)eq(r.to,row.to);
  const b=await pub.getBlock({blockNumber:r.blockNumber});assert.equal(b.hash,r.blockHash);
  receipts.push({hash:row.hash,block:String(r.blockNumber),blockHash:r.blockHash,status:r.status});
}
const collection=e.collection,loan=e.loan,sale=e.sale;
assert.ok((await pub.getCode({address:collection}))!=='0x');
assert.ok((await pub.getCode({address:loan}))!=='0x');
assert.ok((await pub.getCode({address:sale}))!=='0x');
for(const id of [1n,2n,3n]){
 const p=await read(loan,loanArtifact.abi,'positions',[id]);
 assert.equal(Number(p[9]),5,`closed position ${id}`);
}
const p2=await read(loan,loanArtifact.abi,'positions',[2n]);
assert.equal(p2[2],2n);assert.equal(p2[4],10000n);assert.equal(p2[5],1000n);
assert.equal(await read(loan,loanArtifact.abi,'repaymentAmount',[2n]),11000n);
const p3=await read(loan,loanArtifact.abi,'positions',[3n]);
assert.equal(p3[2],4n);assert.equal(p3[4],10000n);assert.equal(p3[7],0n);
const owners={};for(const id of [2n,3n,4n])owners[String(id)]=await read(collection,nftArtifact.abi,'ownerOf',[id]);
eq(owners['2'],e.accounts[1]);eq(owners['3'],e.accounts[1]);eq(owners['4'],e.accounts[0]);
const parent=await read(collection,nftArtifact.abi,'packages',[1n]);assert.equal(Number(parent[3]),2);
const children=await read(collection,nftArtifact.abi,'childrenOf',[1n]);assert.deepEqual(children.map(String),['3','4']);
let sum=0n;for(const id of children){const p=await read(collection,nftArtifact.abi,'packages',[id]);sum+=p[0];assert.equal(Number(p[3]),1);}assert.equal(sum,6000n);
for(const a of e.accounts)assert.equal(await read(loan,loanArtifact.abi,'credits',[a]),0n);
const repay=await pub.getTransactionReceipt({hash:e.scenarios['7-repay'].hashes[0]});
const repayLog=repay.logs.map(l=>{try{return decodeEventLog({abi:loanArtifact.abi,...l})}catch{return null}}).find(l=>l?.eventName==='Repaid');
assert.equal(repayLog.args.id,2n);assert.equal(repayLog.args.amount,11000n);
const withdraw=await pub.getTransactionReceipt({hash:e.scenarios['7-lender-withdraw'].hashes[0]});
const withdrawalLog=withdraw.logs.map(l=>{try{return decodeEventLog({abi:loanArtifact.abi,...l})}catch{return null}}).find(l=>l?.eventName==='Withdrawn');
eq(withdrawalLog.args.recipient,e.accounts[0]);assert.equal(withdrawalLog.args.amount,11000n);
const fund=await pub.getTransactionReceipt({hash:e.scenarios['7-fund'].hashes[0]});
const borrowerWithdraw=await pub.getTransactionReceipt({hash:e.scenarios['7-borrower-withdraw'].hashes[0]});
const fundingTx=await pub.getTransaction({hash:fund.transactionHash});assert.equal(fundingTx.value,10000n);
const repaymentTx=await pub.getTransaction({hash:repay.transactionHash});assert.equal(repaymentTx.value,11000n);
const borrowerLog=borrowerWithdraw.logs.map(l=>{try{return decodeEventLog({abi:loanArtifact.abi,...l})}catch{return null}}).find(l=>l?.eventName==='Withdrawn');
eq(borrowerLog.args.recipient,e.accounts[1]);assert.equal(borrowerLog.args.amount,10000n);
const cancel=await pub.getTransactionReceipt({hash:e.scenarios['7-unfunded-cancel'].hashes[0]});
const cancelTx=await pub.getTransaction({hash:cancel.transactionHash});assert.equal(cancelTx.value,0n);
const saleState=[];for(const id of [1n,2n]){const item=await read(sale,saleArtifact.abi,'offer',[id]);saleState.push({id:String(id),status:String(item[1])});assert.equal(Number(item[1]),2);}
const defaultExport=JSON.parse(await readFile(dir+'/verifier-default.json','utf8'));
const includedExport=JSON.parse(await readFile(dir+'/verifier-confirmed-fictional-pii.json','utf8'));
assert.equal(defaultExport.disclosedFieldsIncluded,false);assert.equal(typeof includedExport.disclosedFields.fullName,'string');assert.equal(typeof includedExport.disclosedFields.bankAccountNumber,'string');
const block=await pub.getBlock();
const manifest={host:e.host,chainId:84532,provider:e.provider,manualMetaMask:false,head:{number:String(block.number),hash:block.hash},scenarios:statuses,scenarioCount:Object.keys(statuses).length,transactions:{count:receipts.length,receipts},formation:e.formation,collection,sale,loan,loanLifecycle:{pledgePosition:'1',fundedPosition:'2',cancelledUnfundedPosition:'3',principalWei:'10000',repaymentWei:'11000',interestWei:'1000',borrowerWithdrawalWei:'10000',lenderWithdrawalWei:'11000',withdrawalCreditsAfterWei:'0',cancelledOfferHadFunding:false,positionsClosed:true,returnedOwners:owners},packageChildren:{parent:'1',parentBurned:true,ids:children.map(String),sumQuantity:String(sum)},saleState,privacy:{defaultExcluded:true,explicitFictionalIncluded:true},sourceEvidence:dir+'/evidence.json',limitations:['Controlled EIP-1193 test-wallet provider, not manual MetaMask extension.','Historical blocked/probe entries in source evidence superseded by later successful live UI actions.']};
assert.equal(manifest.scenarioCount,9);assert.equal(receipts.length,e.transactions.length);
await writeFile(dir+'/final-nine-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({manifest:dir+'/final-nine-manifest.json',scenarioCount:manifest.scenarioCount,statuses:Object.fromEntries(Object.entries(statuses).map(([k,v])=>[k,v.status])),receipts:receipts.length,loanLifecycle:manifest.loanLifecycle,saleState},null,2));
