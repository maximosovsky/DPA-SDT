// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';

/// @notice Experimental native test-ETH bilateral lending and independent time-bound pledge escrow.
contract DPAShareLoan is ERC165, IERC1155Receiver, ReentrancyGuard {
    IERC1155 public immutable units;
    uint256 public constant UNIT_ID = 1;
    enum Status { None, Pledge, Offered, Funded, Repaid, Closed, Defaulted }
    struct Position {
        address borrower;
        address counterparty;
        uint256 collateral;
        uint256 percentBps;
        uint256 principal;
        uint256 interestBps;
        uint256 duration;
        uint256 deadline;
        Status status;
    }
    uint256 public nextId = 1;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256) public credits;
    address private expectedFrom;
    uint256 private expectedAmount;
    event Opened(uint256 indexed id, address indexed borrower, address indexed counterparty, bool loan, uint256 collateral);
    event Funded(uint256 indexed id, uint256 deadline);
    event Repaid(uint256 indexed id, uint256 amount);
    event Closed(uint256 indexed id, Status status);

    constructor(address token) {
        require(token.code.length > 0, 'invalid units');
        units = IERC1155(token);
    }
    /// @return amount Whole-agreement units rounded DOWN; zero-sized collateral is rejected on creation.
    /// @return remainder Numerator remainder after division by 10000, to disclose precision loss.
    function quoteCollateral(address borrower, uint256 percentBps) public view returns (uint256 amount, uint256 remainder) {
        require(percentBps > 0 && percentBps <= 10_000, 'invalid percent');
        uint256 owned = units.balanceOf(borrower, UNIT_ID);
        amount = Math.mulDiv(owned, percentBps, 10_000);
        remainder = mulmod(owned, percentBps, 10_000);
    }
    function createPledge(address counterparty, uint256 percentBps, uint256 duration) external nonReentrant returns (uint256 id) {
        id = _open(counterparty, percentBps, duration, 0, 0, Status.Pledge);
    }
    function createLoan(address lender, uint256 percentBps, uint256 principal, uint256 interestBps, uint256 duration) external nonReentrant returns (uint256 id) {
        require(principal > 0 && interestBps <= 10_000, 'invalid loan');
        id = _open(lender, percentBps, duration, principal, interestBps, Status.Offered);
    }
    function _open(address counterparty, uint256 bps, uint256 duration, uint256 principal, uint256 interestBps, Status status) private returns (uint256 id) {
        require(counterparty != address(0) && counterparty != msg.sender && duration > 0 && duration <= 365 days, 'invalid terms');
        (uint256 amount,) = quoteCollateral(msg.sender, bps);
        require(amount > 0, 'collateral rounds to zero');
        id = nextId++;
        uint256 expiry = status == Status.Pledge ? block.timestamp + duration : 0;
        positions[id] = Position(msg.sender, counterparty, amount, bps, principal, interestBps, duration, expiry, status);
        expectedFrom = msg.sender;
        expectedAmount = amount;
        units.safeTransferFrom(msg.sender, address(this), UNIT_ID, amount, '');
        require(expectedFrom == address(0), 'collateral not received');
        emit Opened(id, msg.sender, counterparty, status == Status.Offered, amount);
    }
    function onERC1155Received(address operator, address from, uint256 tokenId, uint256 value, bytes calldata) external override returns (bytes4) {
        require(msg.sender == address(units) && operator == address(this) && from == expectedFrom && value == expectedAmount && tokenId == UNIT_ID && value > 0, 'unexpected collateral');
        expectedFrom = address(0);
        expectedAmount = 0;
        return IERC1155Receiver.onERC1155Received.selector;
    }
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure override returns (bytes4) {
        revert('batch not accepted');
    }
    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }
    function fund(uint256 id) external payable nonReentrant {
        Position storage p = positions[id];
        require(p.status == Status.Offered && msg.sender == p.counterparty && msg.value == p.principal, 'not agreed funding');
        p.status = Status.Funded;
        p.deadline = block.timestamp + p.duration;
        credits[p.borrower] += msg.value;
        emit Funded(id, p.deadline);
    }
    function repaymentAmount(uint256 id) public view returns (uint256) {
        Position storage p = positions[id];
        require(p.principal > 0, 'not a loan');
        return p.principal + Math.mulDiv(p.principal, p.interestBps, 10_000, Math.Rounding.Ceil);
    }
    function repay(uint256 id) external payable nonReentrant {
        Position storage p = positions[id];
        require(p.status == Status.Funded && msg.sender == p.borrower && block.timestamp <= p.deadline, 'not repayable');
        uint256 amount = repaymentAmount(id);
        require(msg.value == amount, 'exact repayment required');
        p.status = Status.Repaid;
        credits[p.counterparty] += amount;
        emit Repaid(id, amount);
    }
    function withdraw() external nonReentrant {
        uint256 amount = credits[msg.sender];
        require(amount != 0, 'no credit');
        credits[msg.sender] = 0;
        (bool ok,) = payable(msg.sender).call{value: amount}('');
        require(ok, 'withdraw failed');
    }
    function cancelLoan(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        require(p.status == Status.Offered && msg.sender == p.borrower, 'not cancellable');
        _close(id, p, p.borrower, Status.Closed);
    }
    function releasePledge(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        require(p.status == Status.Pledge && msg.sender == p.counterparty, 'not releasable');
        _close(id, p, p.borrower, Status.Closed);
    }
    function reclaimPledge(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        require(p.status == Status.Pledge && msg.sender == p.borrower && block.timestamp > p.deadline, 'not expired');
        _close(id, p, p.borrower, Status.Closed);
    }
    function claimRepaidCollateral(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        require(p.status == Status.Repaid && msg.sender == p.borrower, 'not repaid');
        _close(id, p, p.borrower, Status.Closed);
    }
    function claimDefault(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        require(p.status == Status.Funded && msg.sender == p.counterparty && block.timestamp > p.deadline, 'not defaulted');
        _close(id, p, p.counterparty, Status.Defaulted);
    }
    function _close(uint256 id, Position storage p, address recipient, Status finalStatus) private {
        p.status = finalStatus;
        units.safeTransferFrom(address(this), recipient, UNIT_ID, p.collateral, '');
        emit Closed(id, finalStatus);
    }
}
