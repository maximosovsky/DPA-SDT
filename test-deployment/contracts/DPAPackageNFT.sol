// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/utils/Base64.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

interface IPackageFormation {
 function participants() external view returns(address[] memory);
 function shares() external view returns(uint8[] memory);
 function complete() external view returns(bool);
 function acceptances(address) external view returns(uint256,bytes32,uint256,bool);
 function agreementHash() external view returns(bytes32);
 function versionHash() external view returns(bytes32);
}
/// @notice An independently circulating ERC-721 package; historic parents remain queryable after burn.
/// @dev No ERC-1155 backing is issued or accepted by this collection. One formation per collection.
contract DPAPackageNFT is ERC721 {
 using Strings for uint256;
 using Strings for address;
 enum State {Unknown,Active,Burned,Escrow}
 struct Package {uint256 quantity;uint256 parent;address initialRecipient;State state;}
 IPackageFormation public immutable formation;
 uint256 public immutable chainId;
 uint256 public constant DENOMINATOR=10000;
 uint256 public nextId=1;
 uint256 public totalClaimed;
 uint256 public activeQuantity;
 mapping(address=>uint256) public tokenOf;
 mapping(uint256=>Package) public packages;
 mapping(uint256=>uint256[]) private descendants;
 event PackageClaimed(uint256 indexed id,address indexed recipient,uint256 quantity);
 event PackageSplit(uint256 indexed parent,address indexed owner,uint256[] children);
 event Custody(uint256 indexed id,address indexed custodian,bool locked);
 constructor(address dpa) ERC721('DPA participation package','DPA-PKG') {
  require(dpa.code.length>0,'missing formation');
  IPackageFormation f=IPackageFormation(dpa);
  address[] memory people=f.participants();uint8[] memory shares=f.shares();
  require(people.length>=2&&people.length<=100&&people.length==shares.length,'invalid formation');
  uint256 total;
  for(uint256 i;i<people.length;i++){
   require(people[i]!=address(0)&&shares[i]>0,'invalid participant');
   for(uint256 j;j<i;j++)require(people[j]!=people[i],'duplicate participant');
   total+=shares[i];
  }
  require(total==100&&f.agreementHash()!=bytes32(0)&&f.versionHash()!=bytes32(0),'invalid formation');
  formation=f;chainId=block.chainid;
 }
 function childrenOf(uint256 id) external view returns(uint256[] memory){return descendants[id];}
 function claim() external returns(uint256 id){
  require(formation.complete()&&tokenOf[msg.sender]==0,'not complete or claimed');
  address[] memory people=formation.participants();uint8[] memory shares=formation.shares();
  for(uint256 i;i<people.length;i++)if(people[i]==msg.sender){
   (,,,bool accepted)=formation.acceptances(msg.sender);require(accepted,'not accepted');
   uint256 amount=uint256(shares[i])*100;
   id=nextId++;tokenOf[msg.sender]=id;totalClaimed+=amount;activeQuantity+=amount;
   require(totalClaimed<=DENOMINATOR,'allocation overflow');
   packages[id]=Package(amount,0,msg.sender,State.Active);
   _safeMint(msg.sender,id);emit PackageClaimed(id,msg.sender,amount);return id;
  }
  revert('not participant');
 }
 function split(uint256 id,uint256[] calldata quantities) external returns(uint256[] memory ids){
  require(ownerOf(id)==msg.sender&&packages[id].state==State.Active,'not active owner');
  require(quantities.length>=2&&quantities.length<=100,'invalid children');
  uint256 total;for(uint256 i;i<quantities.length;i++){require(quantities[i]>0,'zero child');total+=quantities[i];}
  require(total==packages[id].quantity,'quantity mismatch');
  packages[id].state=State.Burned;_burn(id);activeQuantity-=total;
  ids=new uint256[](quantities.length);
  for(uint256 i;i<quantities.length;i++){
   uint256 child=nextId++;ids[i]=child;descendants[id].push(child);
   packages[child]=Package(quantities[i],id,msg.sender,State.Active);
   activeQuantity+=quantities[i];_safeMint(msg.sender,child);
  }
  emit PackageSplit(id,msg.sender,ids);
 }
 function markEscrow(uint256 id,bool locked) external {
  require(msg.sender.code.length>0&&ownerOf(id)==msg.sender,'not custodian');
  require(packages[id].state==(locked?State.Active:State.Escrow),'invalid custody transition');
  packages[id].state=locked?State.Escrow:State.Active;emit Custody(id,msg.sender,locked);
 }
 function _update(address to,uint256 id,address auth) internal override returns(address previous){
  if(packages[id].state==State.Escrow)require(msg.sender==_ownerOf(id),'escrow locked');
  return super._update(to,id,auth);
 }
 function tokenURI(uint256 id) public view override returns(string memory){
  ownerOf(id);Package memory p=packages[id];
  string memory json=string.concat('{"name":"DPA package #',id.toString(),'","description":"Experimental participation record; legal rights depend on agreement and applicable law.","attributes":[{"trait_type":"Formation","value":"',address(formation).toHexString(),'"},{"trait_type":"Collection","value":"',address(this).toHexString(),'"},{"trait_type":"Chain ID","value":',chainId.toString(),'},{"trait_type":"Share basis points","value":',p.quantity.toString(),'},{"trait_type":"Parent token ID","value":',p.parent.toString(),'}]}');
  return string.concat('data:application/json;base64,',Base64.encode(bytes(json)));
 }
}
