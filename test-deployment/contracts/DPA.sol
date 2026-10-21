// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import '@openzeppelin/contracts/utils/cryptography/EIP712.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
interface ISDT {function ownerOf(uint256 id) external view returns(address);function records(uint256 id) external view returns(address,bytes32,uint64,bool);}
contract DPA is EIP712 {
 bytes32 public immutable agreementHash;
 address public immutable sdt;
 bytes32 private constant ACCEPT_TYPEHASH=keccak256('Accept(address wallet,bytes32 agreementHash,address sdt,uint256 tokenId,bytes32 identityHash,uint256 nonce)');
 struct Acceptance {uint256 tokenId;bytes32 identityHash;bytes32 agreementHash;uint256 acceptanceBlock;uint256 count;}
 mapping(address=>Acceptance) public acceptances;
 mapping(address=>uint256) public nonces;
 event Accepted(address indexed wallet,uint256 indexed tokenId,bytes32 identityHash,bytes32 agreementHash,uint256 nonce);
 constructor(address trustedSdt,bytes32 versionHash) EIP712('Experimental DPA','1'){require(trustedSdt.code.length>0 && versionHash!=bytes32(0),'invalid deployment');sdt=trustedSdt;agreementHash=versionHash;}
 function accept(address wallet,uint256 tokenId,uint256 nonce,bytes calldata signature) external {
  require(wallet!=address(0)&&nonces[wallet]==nonce,'wallet or nonce');
  require(ISDT(sdt).ownerOf(tokenId)==wallet,'not holder');
  (,bytes32 identityHash,,bool burned)=ISDT(sdt).records(tokenId);
  require(!burned && identityHash!=bytes32(0),'invalid declaration');
  bytes32 digest=_hashTypedDataV4(keccak256(abi.encode(ACCEPT_TYPEHASH,wallet,agreementHash,sdt,tokenId,identityHash,nonce)));
  require(ECDSA.recover(digest,signature)==wallet,'invalid signature');
  nonces[wallet]=nonce+1;
  require(acceptances[wallet].count==0,'already accepted');
  acceptances[wallet]=Acceptance(tokenId,identityHash,agreementHash,block.number,1);
  emit Accepted(wallet,tokenId,identityHash,agreementHash,nonce);
 }
}
