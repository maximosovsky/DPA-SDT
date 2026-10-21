// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import '@openzeppelin/contracts/utils/cryptography/EIP712.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
interface IFormationSDT {function ownerOf(uint256) external view returns(address);function records(uint256) external view returns(address,bytes32,uint64,bool);}
/// @notice Experimental public testnet record. Shares describe contractual allocation only; no asset or payout.
contract DPAFormation is EIP712 {
 address public immutable sdt;
 string public documentRef;
 string public version;
 bytes32 public immutable agreementHash;
 bytes32 public immutable versionHash;
 bytes32 public immutable participantsHash;
 address[] private _participants;
 uint8[] private _shares;
 uint256 public acceptedCount;
 mapping(address=>uint256) public nonces;
 struct Acceptance {uint256 tokenId;bytes32 identityHash;uint256 blockNumber;bool accepted;}
 mapping(address=>Acceptance) public acceptances;
 bytes32 private constant ACCEPT_TYPEHASH=keccak256('Accept(address wallet,bytes32 agreementHash,bytes32 versionHash,bytes32 participantsHash,address sdt,uint256 tokenId,bytes32 identityHash,uint256 nonce)');
 event Accepted(address indexed wallet,uint256 indexed tokenId,bytes32 identityHash,uint256 nonce);
 constructor(address trustedSdt,bytes32 textHash,string memory v,string memory ref,address[] memory people,uint8[] memory allocations) EIP712('Experimental DPA Formation','1') {
  require(trustedSdt.code.length>0 && textHash!=bytes32(0) && bytes(v).length>0,'empty hash or SDT');
  require(bytes(ref).length<=200,'reference too long');
  require(people.length>=2 && people.length==allocations.length && people.length<=100,'at least two participants');
  uint256 total;
  for(uint256 i;i<people.length;i++){
   require(people[i]!=address(0)&&allocations[i]>0,'invalid participant/share');
   for(uint256 j;j<i;j++)require(people[j]!=people[i],'duplicate participant');
   total+=allocations[i];
  }
  require(total==100,'shares must total 100');
  sdt=trustedSdt;documentRef=ref;version=v;agreementHash=textHash;versionHash=keccak256(bytes(v));
  participantsHash=keccak256(abi.encode(people,allocations));_participants=people;_shares=allocations;
 }
 function participants() external view returns(address[] memory){return _participants;}
 function shares() external view returns(uint8[] memory){return _shares;}
 function complete() external view returns(bool){return acceptedCount==_participants.length;}
 function accept(address wallet,uint256 tokenId,uint256 nonce,bytes calldata signature) external {
  bool member;for(uint256 i;i<_participants.length;i++)if(_participants[i]==wallet)member=true;
  require(member&&!acceptances[wallet].accepted&&nonces[wallet]==nonce,'not eligible or replay');
  require(IFormationSDT(sdt).ownerOf(tokenId)==wallet,'not SDT holder');
  (,bytes32 identityHash,,bool burned)=IFormationSDT(sdt).records(tokenId);
  require(!burned&&identityHash!=bytes32(0),'invalid declaration');
  bytes32 digest=_hashTypedDataV4(keccak256(abi.encode(ACCEPT_TYPEHASH,wallet,agreementHash,versionHash,participantsHash,sdt,tokenId,identityHash,nonce)));
  require(ECDSA.recover(digest,signature)==wallet,'invalid signature');
  nonces[wallet]=nonce+1;acceptances[wallet]=Acceptance(tokenId,identityHash,block.number,true);acceptedCount++;
  emit Accepted(wallet,tokenId,identityHash,nonce);
 }
}
