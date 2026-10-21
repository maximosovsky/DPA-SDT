// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import '@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165.sol';
interface ISaleProbe { function buy(uint256 id) external payable; function withdraw() external; }
/// @dev Test-only buyer receiver: attempts to buy the same lot again during ERC1155 delivery.
contract SaleReentryProbe is ERC165, IERC1155Receiver {
    ISaleProbe public immutable sale;
    bool public attempted;
    bool public blocked;
    constructor(address target) { sale = ISaleProbe(target); }
    function purchase(uint256 id) external payable { sale.buy{value: msg.value}(id); }
    function onERC1155Received(address, address, uint256, uint256, bytes calldata) external override returns (bytes4) {
        attempted = true;
        try sale.buy{value: 1}(1) { blocked = false; } catch { blocked = true; }
        return this.onERC1155Received.selector;
    }
    function onERC1155BatchReceived(address, address, uint256[] calldata, uint256[] calldata, bytes calldata) external pure override returns (bytes4) { revert('no batch'); }
    function supportsInterface(bytes4 interfaceId) public view override(ERC165, IERC165) returns (bool) { return interfaceId == type(IERC1155Receiver).interfaceId || super.supportsInterface(interfaceId); }
}
