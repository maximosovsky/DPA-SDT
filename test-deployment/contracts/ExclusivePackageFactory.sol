// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import './ExclusiveDPAFormation.sol';
import './DPAPackageNFTV2.sol';
/// @notice Atomic exclusive NFT formation and designated issuer deployment.
contract ExclusivePackageFactory {
 event Created(address indexed formation,address indexed collection);
 function create(address sdt,bytes32 agreementHash,string calldata version,string calldata documentRef,address[] calldata participants,uint8[] calldata allocations) external returns(address formation,address collection){
  ExclusiveDPAFormation f=new ExclusiveDPAFormation(sdt,agreementHash,version,documentRef,participants,allocations);
  DPAPackageNFTV2 nft=new DPAPackageNFTV2(address(f));
  f.bindIssuer(address(nft));
  formation=address(f);collection=address(nft);emit Created(formation,collection);
 }
}
