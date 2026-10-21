// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import '@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
import './DPAPackageSale.sol';
/// @notice Specific-package pledge and native test-ETH funded loan. No SDT loan authorization.
contract DPAPackageLoan is IERC721Receiver,ReentrancyGuard {
 using Math for uint256;
 enum Status {None,Pledge,Offered,Funded,Repaid,Closed,Defaulted}
 struct Position {address borrower;address counterparty;uint256 tokenId;uint256 quantity;uint256 principal;uint256 interestBps;uint256 duration;uint256 deadline;bytes32 termsHash;Status status;}
 IPackageSaleToken public immutable collection;
 uint256 public nextId=1;
 mapping(uint256=>Position) public positions;
 mapping(address=>uint256) public credits;
 address private expectedFrom;uint256 private expectedToken;
 event Opened(uint256 indexed id,uint256 indexed tokenId,address indexed borrower,Status status,bytes32 termsHash);
 event Funded(uint256 indexed id,uint256 deadline);
 event Repaid(uint256 indexed id,uint256 amount);
 event Closed(uint256 indexed id,Status status);
 event Withdrawn(address indexed recipient,uint256 amount);
 constructor(address nft){require(nft.code.length>0,'missing collection');collection=IPackageSaleToken(nft);}
 function createPledge(uint256 tokenId,address counterparty,uint256 duration,bytes32 termsHash) external nonReentrant returns(uint256){return _open(tokenId,counterparty,0,0,duration,termsHash,Status.Pledge);}
 function createLoan(uint256 tokenId,address lender,uint256 principal,uint256 interestBps,uint256 duration,bytes32 termsHash) external nonReentrant returns(uint256){require(principal>0&&interestBps<=10000,'invalid principal/interest');return _open(tokenId,lender,principal,interestBps,duration,termsHash,Status.Offered);}
 function _open(uint256 tokenId,address counterparty,uint256 principal,uint256 interestBps,uint256 duration,bytes32 termsHash,Status status) private returns(uint256 id){
  require(counterparty!=address(0)&&counterparty!=msg.sender&&duration>0&&duration<=365 days&&termsHash!=bytes32(0),'invalid terms');
  require(collection.ownerOf(tokenId)==msg.sender,'not owner');
  (uint256 quantity,,,uint8 state)=collection.packages(tokenId);require(state==1&&quantity>0,'not active');
  id=nextId++;positions[id]=Position(msg.sender,counterparty,tokenId,quantity,principal,interestBps,duration,status==Status.Pledge?block.timestamp+duration:0,termsHash,status);
  expectedFrom=msg.sender;expectedToken=tokenId;
  collection.safeTransferFrom(msg.sender,address(this),tokenId);
  require(expectedFrom==address(0),'NFT not received');collection.markEscrow(tokenId,true);
  emit Opened(id,tokenId,msg.sender,status,termsHash);
 }
 function onERC721Received(address operator,address from,uint256 tokenId,bytes calldata) external override returns(bytes4){
  require(msg.sender==address(collection)&&operator==address(this)&&from==expectedFrom&&tokenId==expectedToken,'unsolicited NFT');
  expectedFrom=address(0);expectedToken=0;return IERC721Receiver.onERC721Received.selector;
 }
 function fund(uint256 id) external payable nonReentrant {
  Position storage p=positions[id];require(p.status==Status.Offered&&msg.sender==p.counterparty&&msg.value==p.principal,'not agreed funding');
  p.status=Status.Funded;p.deadline=block.timestamp+p.duration;credits[p.borrower]+=msg.value;emit Funded(id,p.deadline);
 }
 function repaymentAmount(uint256 id) public view returns(uint256){Position storage p=positions[id];require(p.principal>0,'not loan');return p.principal+Math.mulDiv(p.principal,p.interestBps,10000,Math.Rounding.Ceil);}
 function repay(uint256 id) external payable nonReentrant {
  Position storage p=positions[id];require(p.status==Status.Funded&&msg.sender==p.borrower&&block.timestamp<=p.deadline&&msg.value==repaymentAmount(id),'not agreed repayment');
  p.status=Status.Repaid;credits[p.counterparty]+=msg.value;emit Repaid(id,msg.value);
 }
 function cancelLoan(uint256 id) external nonReentrant {Position storage p=positions[id];require(p.status==Status.Offered&&msg.sender==p.borrower,'not cancellable');_close(id,p,p.borrower,Status.Closed);}
 function releasePledge(uint256 id) external nonReentrant {Position storage p=positions[id];require(p.status==Status.Pledge&&msg.sender==p.counterparty,'not pledge counterparty');_close(id,p,p.borrower,Status.Closed);}
 function reclaimPledge(uint256 id) external nonReentrant {Position storage p=positions[id];require(p.status==Status.Pledge&&msg.sender==p.borrower&&block.timestamp>p.deadline,'not expired pledge');_close(id,p,p.borrower,Status.Closed);}
 function claimRepaidCollateral(uint256 id) external nonReentrant {Position storage p=positions[id];require(p.status==Status.Repaid&&msg.sender==p.borrower,'not repaid borrower');_close(id,p,p.borrower,Status.Closed);}
 function claimDefault(uint256 id) external nonReentrant {Position storage p=positions[id];require(p.status==Status.Funded&&msg.sender==p.counterparty&&block.timestamp>p.deadline,'not defaulted');_close(id,p,p.counterparty,Status.Defaulted);}
 function _close(uint256 id,Position storage p,address recipient,Status status) private {p.status=status;collection.markEscrow(p.tokenId,false);collection.safeTransferFrom(address(this),recipient,p.tokenId);emit Closed(id,status);}
 function withdraw() external nonReentrant {uint256 value=credits[msg.sender];require(value>0,'no credit');credits[msg.sender]=0;(bool ok,)=payable(msg.sender).call{value:value}('');require(ok,'withdraw failed');emit Withdrawn(msg.sender,value);}
}
