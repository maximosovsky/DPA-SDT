// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import '@openzeppelin/contracts/token/ERC721/IERC721.sol';
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
interface IPackageSaleToken is IERC721 {
 function formation() external view returns(address);
 function packages(uint256) external view returns(uint256,uint256,address,uint8);
 function markEscrow(uint256,bool) external;
}
interface ISaleFormation {function sdt() external view returns(address);}
interface ISaleSDT {function ownerOf(uint256) external view returns(address);function records(uint256) external view returns(address,bytes32,uint64,bool);}
/// @notice Bilateral typed sale with offer-time seller signature, execution-time buyer signature.
contract DPAPackageSale is IERC721Receiver,ReentrancyGuard {
 struct Terms {address seller;address buyer;address formation;address collection;uint256 tokenId;uint256 quantity;uint256 price;bytes32 termsHash;bool withSDT;uint256 sellerSdtId;bytes32 sellerIdentityHash;uint256 buyerSdtId;bytes32 buyerIdentityHash;uint256 sellerNonce;uint256 buyerNonce;uint256 deadline;}
 enum Status {None,Open,Sold,Cancelled}
 struct Offer {Terms terms;Status status;}
 bytes32 private constant SALE_TYPEHASH=keccak256('Sale(address seller,address buyer,address formation,address collection,uint256 tokenId,uint256 quantity,uint256 price,bytes32 termsHash,bool withSDT,uint256 sellerSdtId,bytes32 sellerIdentityHash,uint256 buyerSdtId,bytes32 buyerIdentityHash,uint256 sellerNonce,uint256 buyerNonce,uint256 deadline)');
 IPackageSaleToken public immutable collection;
 ISaleSDT public immutable sdt;
 uint256 public nextId=1;
 mapping(uint256=>Offer) private offers;
 mapping(address=>uint256) public nonces;
 mapping(address=>uint256) public credits;
 address private expectedSeller;uint256 private expectedToken;
 event Offered(uint256 indexed id,address indexed seller,address indexed buyer,uint256 tokenId,uint256 quantity,uint256 price,bytes32 termsHash,bool withSDT);
 event Purchased(uint256 indexed id,uint256 indexed tokenId,address indexed buyer,uint256 price);
 event Cancelled(uint256 indexed id);
 event Withdrawn(address indexed seller,uint256 amount);
 constructor(address nft,address identity){
  require(nft.code.length>0&&identity.code.length>0,'missing code');
  require(ISaleFormation(IPackageSaleToken(nft).formation()).sdt()==identity,'formation SDT mismatch');
  collection=IPackageSaleToken(nft);sdt=ISaleSDT(identity);
 }
 function offer(uint256 id) external view returns(Terms memory terms,Status status){Offer storage o=offers[id];return(o.terms,o.status);}
 function digest(Terms calldata t) public view returns(bytes32){
  bytes32 domain=keccak256(abi.encode(keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),keccak256('DPA Package Sale'),keccak256('1'),block.chainid,address(this)));
  return keccak256(abi.encodePacked(hex'1901',domain,keccak256(abi.encode(SALE_TYPEHASH,t))));
 }
 function _identity(address owner,uint256 id,bytes32 snapshot) private view {
  require(sdt.ownerOf(id)==owner,'SDT ownership changed');
  (,bytes32 value,,bool burned)=sdt.records(id);
  require(!burned&&value!=bytes32(0)&&value==snapshot,'SDT snapshot changed');
 }
 function _valid(Terms calldata t) private view {
  require(t.seller!=address(0)&&t.buyer!=address(0)&&t.seller!=t.buyer&&t.price>0&&t.quantity>0&&t.termsHash!=bytes32(0),'invalid terms');
  require(t.deadline>=block.timestamp&&t.collection==address(collection)&&t.formation==collection.formation(),'expired or wrong collection');
  (uint256 quantity,,,uint8 status)=collection.packages(t.tokenId);
  require(quantity==t.quantity&&(status==1||status==3&&collection.ownerOf(t.tokenId)==address(this)),'package changed');
  if(t.withSDT){_identity(t.seller,t.sellerSdtId,t.sellerIdentityHash);_identity(t.buyer,t.buyerSdtId,t.buyerIdentityHash);}
  else require(t.sellerSdtId==0&&t.buyerSdtId==0&&t.sellerIdentityHash==bytes32(0)&&t.buyerIdentityHash==bytes32(0),'SDT fields must be absent');
 }
 function createOffer(Terms calldata t,bytes calldata sellerSignature) external nonReentrant returns(uint256 id){
  require(msg.sender==t.seller&&collection.ownerOf(t.tokenId)==t.seller,'seller not owner');_valid(t);
  require(t.sellerNonce==nonces[t.seller]&&t.buyerNonce==nonces[t.buyer],'nonce changed');
  require(ECDSA.recover(digest(t),sellerSignature)==t.seller,'seller signature');
  nonces[t.seller]++;
  id=nextId++;offers[id]=Offer(t,Status.Open);
  expectedSeller=t.seller;expectedToken=t.tokenId;
  collection.safeTransferFrom(t.seller,address(this),t.tokenId);
  require(expectedSeller==address(0),'NFT not received');
  collection.markEscrow(t.tokenId,true);
  emit Offered(id,t.seller,t.buyer,t.tokenId,t.quantity,t.price,t.termsHash,t.withSDT);
 }
 function onERC721Received(address operator,address from,uint256 id,bytes calldata) external override returns(bytes4){
  require(msg.sender==address(collection)&&operator==address(this)&&from==expectedSeller&&id==expectedToken,'unsolicited NFT');
  expectedSeller=address(0);expectedToken=0;return IERC721Receiver.onERC721Received.selector;
 }
 function buy(uint256 id,Terms calldata t,bytes calldata buyerSignature) external payable nonReentrant {
  Offer storage o=offers[id];require(o.status==Status.Open&&msg.sender==t.buyer&&msg.value==t.price&&keccak256(abi.encode(o.terms))==keccak256(abi.encode(t)),'not agreed purchase');
  _valid(t);require(t.buyerNonce==nonces[t.buyer],'buyer nonce changed');
  require(ECDSA.recover(digest(t),buyerSignature)==t.buyer,'buyer signature');
  nonces[t.buyer]++;o.status=Status.Sold;credits[t.seller]+=msg.value;
  collection.markEscrow(t.tokenId,false);collection.safeTransferFrom(address(this),t.buyer,t.tokenId);
  emit Purchased(id,t.tokenId,t.buyer,t.price);
 }
 function cancel(uint256 id) external nonReentrant {
  Offer storage o=offers[id];require(o.status==Status.Open&&o.terms.seller==msg.sender,'not cancellable');
  o.status=Status.Cancelled;Terms storage t=o.terms;
  collection.markEscrow(t.tokenId,false);collection.safeTransferFrom(address(this),t.seller,t.tokenId);
  emit Cancelled(id);
 }
 function withdraw() external nonReentrant {
  uint256 value=credits[msg.sender];require(value>0,'no credit');credits[msg.sender]=0;
  (bool ok,)=payable(msg.sender).call{value:value}('');require(ok,'withdraw failed');emit Withdrawn(msg.sender,value);
 }
}
