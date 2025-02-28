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
        bool isForSale;
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

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);

        nftDetails[tokenId] = NFT(tokenId, title, description, category, price, msg.sender, false);

        emit NFTMinted(msg.sender, tokenId, tokenURI, title, description, category, price);
    }

    /// @notice Get total number of minted NFTs
    function getTotalMintedNFTs() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /// @notice List NFT for sale
    function listNFTForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "You do not own this NFT");
        require(price > 0, "Price must be greater than zero");

        nftDetails[tokenId].price = price;
        nftDetails[tokenId].isForSale = true;

        emit NFTListed(tokenId, price);
    }

    /// @notice Buy an NFT
    function buyNFT(uint256 tokenId) public payable {
        NFT storage nft = nftDetails[tokenId];
        require(nft.isForSale, "NFT is not for sale");
        require(msg.value >= nft.price, "Not enough Ether to buy NFT");

        address seller = nft.owner;

        // Transfer NFT to new owner
        _transfer(seller, msg.sender, tokenId);

        // Transfer funds to seller
        payable(seller).transfer(msg.value);

        // Update NFT ownership
        nft.owner = msg.sender;
        nft.isForSale = false;

        emit NFTSold(tokenId, seller, msg.sender, msg.value);
    }

    /// Events
    event NFTMinted(address indexed owner, uint256 tokenId, string tokenURI, string title, string description, string category, uint256 price);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTSold(uint256 indexed tokenId, address seller, address buyer, uint256 price);
}
