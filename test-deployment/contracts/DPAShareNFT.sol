// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/utils/Base64.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

interface IShareFormation {
    function participants() external view returns (address[] memory);
    function shares() external view returns (uint8[] memory);
    function complete() external view returns (bool);
    function acceptances(address) external view returns (uint256, bytes32, uint256, bool);
    function agreementHash() external view returns (bytes32);
    function versionHash() external view returns (bytes32);
}

/// @notice A locked visual receipt of an accepted allocation in one fixed formation.
/// @dev Neither ownership nor ERC721 transfers contractual rights or establishes legal classification.
contract DPAShareNFT is ERC721 {
    using Strings for uint256;
    using Strings for address;

    IShareFormation public immutable formation;
    uint256 public immutable chainId;
    uint256 public totalClaimed;
    mapping(address => uint256) public tokenOf;
    error Nontransferable();

    constructor(address formationAddress) ERC721('DPA participation share', 'DPA-SHARE') {
        require(formationAddress.code.length != 0, 'formation has no code');
        IShareFormation candidate = IShareFormation(formationAddress);
        address[] memory people = candidate.participants();
        uint8[] memory allocations = candidate.shares();
        require(people.length >= 2 && people.length <= 100 && people.length == allocations.length, 'invalid formation');
        uint256 sum;
        for (uint256 i; i < people.length; ++i) {
            require(people[i] != address(0) && allocations[i] != 0, 'invalid allocation');
            for (uint256 j; j < i; ++j) require(people[i] != people[j], 'duplicate participant');
            sum += allocations[i];
        }
        require(sum == 100 && candidate.agreementHash() != bytes32(0) && candidate.versionHash() != bytes32(0), 'invalid formation commitment');
        formation = candidate;
        chainId = block.chainid; // Snapshot the network of deployment; never silently relabel on a fork.
    }

    /// @notice Only the recorded wallet claims its own token, after every acceptance.
    function claim() external returns (uint256 id) {
        require(formation.complete(), 'agreement not fully accepted');
        require(tokenOf[msg.sender] == 0, 'already claimed');
        address[] memory people = formation.participants();
        for (uint256 i; i < people.length; ++i) {
            if (people[i] == msg.sender) {
                (,,, bool accepted) = formation.acceptances(msg.sender);
                require(accepted, 'not accepted');
                id = i + 1;
                tokenOf[msg.sender] = id;
                ++totalClaimed;
                _safeMint(msg.sender, id);
                return id;
            }
        }
        revert('not a participant');
    }

    function locked(uint256 id) external view returns (bool) {
        ownerOf(id);
        return true;
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == 0xb45a3c0e || super.supportsInterface(interfaceId); // ERC-5192
    }

    function approve(address, uint256) public pure override { revert Nontransferable(); }
    function setApprovalForAll(address, bool) public pure override { revert Nontransferable(); }
    function _update(address to, uint256 id, address auth) internal override returns (address) {
        if (_ownerOf(id) != address(0)) revert Nontransferable(); // Includes transfers and burns.
        return super._update(to, id, auth);
    }

    /// @dev Only fixed labels, checksummed hex identifiers and decimal numbers enter SVG/JSON.
    ///      Neither agreement text nor version text nor identity digests are interpolated.
    function tokenURI(uint256 id) public view override returns (string memory) {
        address wallet = ownerOf(id);
        address[] memory people = formation.participants();
        uint8[] memory shares = formation.shares();
        require(id <= people.length && people[id - 1] == wallet && shares.length == people.length, 'inconsistent formation');
        uint256 share = uint256(shares[id - 1]);
        string memory json = string.concat(
            '{"name":"DPA participation share",',
            '"description":"Evidence of an accepted agreement allocation only; no automatic transfer of contractual rights or legal classification.",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(_svg(wallet, share))), '",',
            '"attributes":[{"trait_type":"Wallet","value":"', wallet.toHexString(), '"},',
            '{"trait_type":"Formation","value":"', address(formation).toHexString(), '"},',
            '{"trait_type":"Chain ID","value":', chainId.toString(), '},',
            '{"trait_type":"Agreement hash","value":"', Strings.toHexString(uint256(formation.agreementHash()), 32), '"},',
            '{"trait_type":"Version hash","value":"', Strings.toHexString(uint256(formation.versionHash()), 32), '"},',
            '{"trait_type":"Share basis points","value":', (share * 100).toString(), '},',
            '{"trait_type":"Share percent","value":"', share.toString(), '%"}]}'
        );
        return string.concat('data:application/json;base64,', Base64.encode(bytes(json)));
    }

    function _svg(address wallet, uint256 share) private view returns (string memory) {
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="760" height="330" viewBox="0 0 760 330">',
            '<rect width="760" height="330" fill="#101b30"/><g fill="#ffffff" font-family="monospace">',
            '<text x="24" y="35" font-size="24">DPA participation share</text>',
            '<text x="24" y="75" font-size="30">', share.toString(), '%</text>',
            '<text x="24" y="105" font-size="15">Wallet: ', wallet.toHexString(), '</text>',
            '<text x="24" y="130" font-size="15">Formation: ', address(formation).toHexString(), '</text>',
            '<text x="24" y="155" font-size="14">Chain ID: ', chainId.toString(), '</text>',
            '<text x="24" y="180" font-size="12">Agreement: ', Strings.toHexString(uint256(formation.agreementHash()), 32), '</text>',
            '<text x="24" y="205" font-size="12">Version: ', Strings.toHexString(uint256(formation.versionHash()), 32), '</text>',
            '<text x="24" y="255" font-size="13">Evidence only; not a transfer of rights</text></g></svg>'
        );
    }
}
