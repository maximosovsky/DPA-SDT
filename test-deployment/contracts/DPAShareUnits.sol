// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/utils/Base64.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

interface IUnitsFormation {
    function participants() external view returns (address[] memory);
    function shares() external view returns (uint8[] memory);
    function complete() external view returns (bool);
    function acceptances(address) external view returns (uint256, bytes32, uint256, bool);
    function agreementHash() external view returns (bytes32);
    function versionHash() external view returns (bytes32);
}

/// @notice Fungible units of one accepted agreement, NOT a transfer of contractual rights.
/// @dev 10,000 whole-agreement units share one ERC1155 token ID. Separate original acceptances are immutable.
contract DPAShareUnits is ERC1155 {
    using Strings for uint256;
    using Strings for address;
    uint256 public constant UNIT_ID = 1;
    uint256 public constant MAX_UNITS = 10_000;
    IUnitsFormation public immutable formation;
    uint256 public immutable chainId;
    uint256 public totalSupply;
    mapping(address => bool) public claimed;

    constructor(address formationAddress) ERC1155('') {
        require(formationAddress.code.length != 0, 'formation has no code');
        IUnitsFormation candidate = IUnitsFormation(formationAddress);
        address[] memory people = candidate.participants();
        uint8[] memory allocations = candidate.shares();
        require(people.length >= 2 && people.length <= 100 && people.length == allocations.length, 'invalid formation');
        uint256 sum;
        for (uint256 i; i < people.length; ++i) {
            require(people[i] != address(0) && allocations[i] != 0, 'invalid allocation');
            for (uint256 j; j < i; ++j) require(people[i] != people[j], 'duplicate participant');
            sum += allocations[i];
        }
        require(sum == 100 && candidate.agreementHash() != bytes32(0) && candidate.versionHash() != bytes32(0), 'invalid commitment');
        formation = candidate;
        chainId = block.chainid;
    }

    function claim() external returns (uint256 amount) {
        require(formation.complete(), 'agreement not fully accepted');
        require(!claimed[msg.sender], 'already claimed');
        address[] memory people = formation.participants();
        uint8[] memory allocations = formation.shares();
        for (uint256 i; i < people.length; ++i) {
            if (people[i] == msg.sender) {
                (,,, bool accepted) = formation.acceptances(msg.sender);
                require(accepted, 'not accepted');
                amount = uint256(allocations[i]) * 100;
                claimed[msg.sender] = true;
                totalSupply += amount;
                require(totalSupply <= MAX_UNITS, 'supply cap');
                _mint(msg.sender, UNIT_ID, amount, '');
                return amount;
            }
        }
        revert('not a participant');
    }

    function uri(uint256 id) public view override returns (string memory) {
        require(id == UNIT_ID, 'unknown unit');
        string memory svg = string.concat('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="200"><rect width="640" height="200" fill="#101b30"/><text x="24" y="65" fill="white" font-size="24">DPA participation units</text><text x="24" y="110" fill="white" font-size="18">10000 units = whole agreement</text></svg>');
        string memory json = string.concat('{"name":"DPA participation units","description":"Transferable units evidence an allocation; contractual rights and legal classification are not determined by token ownership.","image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '","attributes":[{"trait_type":"Whole agreement units","value":10000},{"trait_type":"Formation","value":"', address(formation).toHexString(), '"},{"trait_type":"Chain ID","value":', chainId.toString(), '},{"trait_type":"Agreement hash","value":"', Strings.toHexString(uint256(formation.agreementHash()), 32), '"},{"trait_type":"Version hash","value":"', Strings.toHexString(uint256(formation.versionHash()), 32), '"}]}');
        return string.concat('data:application/json;base64,', Base64.encode(bytes(json)));
    }
}
