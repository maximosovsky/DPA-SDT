// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
contract SDT is ERC721 {
 struct Record {address issuer;bytes32 identityHash;uint64 issuanceBlock;bool burned;}
 mapping(uint256=>Record) public records;
 uint256 public nextId=1;
 error Nontransferable();
 constructor() ERC721('Self-Declared Token (experimental)','SDT') {}
 function mint(bytes32 identityHash) external returns(uint256 id){require(identityHash!=bytes32(0),'empty hash');id=nextId++; records[id]=Record(msg.sender,identityHash,uint64(block.number),false);_safeMint(msg.sender,id);}
 function burn(uint256 id) external {require(ownerOf(id)==msg.sender,'not owner');records[id].burned=true;_burn(id);}
 function locked(uint256 id) external view returns(bool){ownerOf(id);return true;}
 function supportsInterface(bytes4 interfaceId) public view override returns(bool){return interfaceId==0xb45a3c0e||super.supportsInterface(interfaceId);}
 function _update(address to,uint256 id,address auth) internal override returns(address){if(_ownerOf(id)!=address(0)&&to!=address(0))revert Nontransferable();return super._update(to,id,auth);}
}
