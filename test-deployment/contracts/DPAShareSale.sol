// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/// @notice Fixed-price, all-or-nothing bilateral sale of experimental DPA units for native test ETH.
/// @dev Token possession does not itself establish transfer of off-chain contractual rights.
contract DPAShareSale is ERC165, IERC1155Receiver, ReentrancyGuard {
    IERC1155 public immutable units;
    uint256 public immutable chainId;
    uint256 public constant UNIT_ID = 1;
    enum Status { None, Open, Sold, Cancelled }
    struct Offer { address seller; address buyer; uint256 amount; uint256 price; Status status; }
    uint256 public nextId = 1;
    mapping(uint256 => Offer) public offers;
    mapping(address => uint256) public credits;
    address private expectedFrom;
    uint256 private expectedAmount;
    event Offered(uint256 indexed id, address indexed seller, address indexed buyer, uint256 amount, uint256 price);
    event Purchased(uint256 indexed id, address indexed buyer, uint256 amount, uint256 price);
    event Cancelled(uint256 indexed id);
    event Withdrawn(address indexed seller, uint256 amount);

    constructor(address token) {
        require(token.code.length != 0, 'invalid units');
        units = IERC1155(token);
        chainId = block.chainid;
    }
    function createOffer(address buyer, uint256 amount, uint256 price) external nonReentrant returns (uint256 id) {
        require(buyer != address(0) && buyer != msg.sender && amount > 0 && price > 0, 'invalid offer');
        require(units.balanceOf(msg.sender, UNIT_ID) >= amount, 'insufficient units');
        id = nextId++;
        offers[id] = Offer(msg.sender, buyer, amount, price, Status.Open);
        expectedFrom = msg.sender;
        expectedAmount = amount;
        units.safeTransferFrom(msg.sender, address(this), UNIT_ID, amount, '');
        require(expectedFrom == address(0), 'units not received');
        emit Offered(id, msg.sender, buyer, amount, price);
    }
    function onERC1155Received(address operator, address from, uint256 tokenId, uint256 value, bytes calldata) external override returns (bytes4) {
        require(msg.sender == address(units) && operator == address(this) && from == expectedFrom && value == expectedAmount && tokenId == UNIT_ID && value > 0, 'unexpected units');
        expectedFrom = address(0);
        expectedAmount = 0;
        return IERC1155Receiver.onERC1155Received.selector;
    }
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure override returns (bytes4) { revert('batch not accepted'); }
    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) { return interfaceId == type(IERC1155Receiver).interfaceId || super.supportsInterface(interfaceId); }
    function buy(uint256 id) external payable nonReentrant {
        Offer storage offer = offers[id];
        require(offer.status == Status.Open && msg.sender == offer.buyer && msg.value == offer.price, 'not agreed purchase');
        offer.status = Status.Sold;
        credits[offer.seller] += msg.value;
        units.safeTransferFrom(address(this), msg.sender, UNIT_ID, offer.amount, '');
        emit Purchased(id, msg.sender, offer.amount, offer.price);
    }
    function cancel(uint256 id) external nonReentrant {
        Offer storage offer = offers[id];
        require(offer.status == Status.Open && msg.sender == offer.seller, 'not cancellable');
        offer.status = Status.Cancelled;
        units.safeTransferFrom(address(this), msg.sender, UNIT_ID, offer.amount, '');
        emit Cancelled(id);
    }
    function withdraw() external nonReentrant {
        uint256 amount = credits[msg.sender];
        require(amount > 0, 'no credit');
        credits[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}('');
        require(ok, 'withdraw failed');
        emit Withdrawn(msg.sender, amount);
    }
}
