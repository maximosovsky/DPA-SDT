import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const root=resolve('.');
const manifest=JSON.parse(await readFile(join(root,'docs/evidence/base-sepolia/exclusive-nft-package/manifest.json'),'utf8'));
for(const name of ['SDT','ExclusiveDPAFormation','ExclusivePackageFactory','DPAPackageNFTV2','DPAPackageSale','DPAPackageLoan']){
 const path=`artifacts/contracts/${name}.sol/${name}.json`;
 const canonical=await readFile(join(root,'canonical-artifacts',path));
 if(createHash('sha256').update(canonical).digest('hex')!==manifest.artifactHashes[name])throw Error('Canonical pilot artifact hash mismatch: '+name);
 const parsed=JSON.parse(canonical);
 if(parsed.contractName!==name||!parsed.deployedBytecode||!parsed.abi)throw Error('Invalid canonical pilot artifact: '+name);
 const output=join(root,path);await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,canonical);
}
console.log('Pinned six exact deployed pilot artifacts by SHA-256 before bundling');
