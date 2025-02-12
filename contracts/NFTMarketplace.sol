// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct NFT {
        uint256 tokenId;
        string title;
        string description;
        string category;
        uint256 price;
        address owner;
    }

    mapping(uint256 => NFT) public nftDetails;

    constructor() ERC721("NFTMarketplace", "NFTM") {}

    /// @notice Mint a new NFT with metadata
    function mintNFT(
        string memory tokenURI,
        string memory title,
        string memory description,
        string memory category,
        uint256 price
    ) public {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(msg.sender, tokenId); // Minting NFT to caller's address
        _setTokenURI(tokenId, tokenURI);

        nftDetails[tokenId] = NFT(tokenId, title, description, category, price, msg.sender);

        emit NFTMinted(msg.sender, tokenId, tokenURI, title, description, category, price);
    }

    /// @notice Fetch total number of NFTs minted
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /// @notice Fetch NFT details by tokenId
    function getNFTDetails(uint256 tokenId) public view returns (NFT memory) {
        return nftDetails[tokenId];
    }

    event NFTMinted(
        address indexed owner,
        uint256 tokenId,
        string tokenURI,
        string title,
        string description,
        string category,
        uint256 price
    );
}
