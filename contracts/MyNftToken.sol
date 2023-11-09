// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MyNftToken is ERC721A, Ownable {
    string private baseURI;
    bool public paused = true;

    bytes32 public merkleRoot;
    mapping(address => bool) public whitelistClaimed;

    event Withdrawal(uint256 indexed amount);

    constructor (
        string memory name,
        string memory symbol,
        address owner,
        string memory baseURI_
    )
    ERC721A(name, symbol)
    Ownable(owner)
    {
        baseURI = baseURI_;
    }

    function _baseURI() internal override view returns (string memory) {
        return baseURI;
    }

    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        if (operator == (super.owner())) {
            return true;
        }
        return super.isApprovedForAll(owner, operator);
    }

    function setPaused() external onlyOwner {
        paused = !paused;
    }

    function setMerkleRoot(bytes32 merkleRoot_) external onlyOwner {
        if (merkleRoot != merkleRoot_) {
            merkleRoot = merkleRoot_;
        }
    }

    function mint(uint256 quantity) external payable {
        require(!paused, 'Mint unavailable');
        if (_msgSenderERC721A() != owner()) {
            require(msg.value >= quantity * 0.01 ether, 'Value too low');
        }
        _mint(_msgSenderERC721A(), quantity);
    }

    function whitelistMint(bytes32[] calldata _merkleProof) external {
        require(!whitelistClaimed[_msgSenderERC721A()], 'Address has already claimed');

        bytes32 leaf = keccak256(abi.encodePacked(_msgSenderERC721A()));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), 'Invalid proof');
        whitelistClaimed[_msgSenderERC721A()] = true;

        _mint(_msgSenderERC721A(), 1);
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(address(this).balance > amount , 'Balance too low');
        payable (owner()).transfer(amount);
        emit Withdrawal(amount);
    }
}