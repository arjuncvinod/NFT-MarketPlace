// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable, ERC721Holder {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Enum to represent the sale status of an NFT
    enum SaleStatus { NotForSale, FixedPrice, Auction }

    // Struct for NFT details
    struct NFT {
        uint256 tokenId;
        string title;
        string description;
        string category;
        uint256 price;      // Used for FixedPrice sales
        SaleStatus status;  // Indicates if NFT is for sale or in auction
    }

    // Struct for auction details
    struct Auction {
        address seller;        // Original owner who listed the NFT for auction
        uint256 startingBid;   // Minimum bid to start the auction
        uint256 endTime;       // Timestamp when the auction ends
        address highestBidder; // Current highest bidder
        uint256 highestBid;    // Current highest bid amount
        bool ended;            // Whether the auction has been finalized
    }

    // Mappings
    mapping(uint256 => NFT) public nftDetails;      // NFT metadata
    mapping(uint256 => Auction) public auctions;    // Auction details per tokenId

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

        nftDetails[tokenId] = NFT(tokenId, title, description, category, price, SaleStatus.NotForSale);

        emit NFTMinted(msg.sender, tokenId, tokenURI, title, description, category, price);
    }

    /// @notice Get total number of minted NFTs
    function getTotalMintedNFTs() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /// @notice List NFT for sale at a fixed price
    function listNFTForSale(uint256 tokenId, uint256 price) public {
        require(ownerOf(tokenId) == msg.sender, "You do not own this NFT");
        require(nftDetails[tokenId].status == SaleStatus.NotForSale, "NFT is already listed or in auction");
        require(price > 0, "Price must be greater than zero");

        nftDetails[tokenId].price = price;
        nftDetails[tokenId].status = SaleStatus.FixedPrice;

        emit NFTListed(tokenId, price);
    }

    /// @notice Buy an NFT listed for sale at a fixed price
    function buyNFT(uint256 tokenId) public payable {
        NFT storage nft = nftDetails[tokenId];
        require(nft.status == SaleStatus.FixedPrice, "NFT is not for sale at a fixed price");
        require(msg.value >= nft.price, "Not enough Ether to buy NFT");

        address seller = ownerOf(tokenId);

        // Transfer NFT to buyer
        _transfer(seller, msg.sender, tokenId);

        // Transfer Ether to seller
        payable(seller).transfer(msg.value);

        // Update status
        nft.status = SaleStatus.NotForSale;

        emit NFTSold(tokenId, seller, msg.sender, msg.value);
    }

    /// @notice List an NFT for auction
    function listNFTForAuction(uint256 tokenId, uint256 startingBid, uint256 duration) public {
        require(ownerOf(tokenId) == msg.sender, "You do not own this NFT");
        require(nftDetails[tokenId].status == SaleStatus.NotForSale, "NFT is already listed or in auction");
        require(startingBid > 0, "Starting bid must be greater than zero");
        require(duration > 0, "Duration must be greater than zero");

        // Transfer NFT to the contract
        _transfer(msg.sender, address(this), tokenId);

        // Set up auction
        auctions[tokenId] = Auction({
            seller: msg.sender,
            startingBid: startingBid,
            endTime: block.timestamp + duration,
            highestBidder: address(0),
            highestBid: 0,
            ended: false
        });

        // Update NFT status
        nftDetails[tokenId].status = SaleStatus.Auction;

        emit NFTListedForAuction(tokenId, startingBid, duration);
    }

    /// @notice Place a bid on an NFT in auction
    function bidOnNFT(uint256 tokenId) public payable {
        Auction storage auction = auctions[tokenId];
        require(nftDetails[tokenId].status == SaleStatus.Auction, "NFT is not in auction");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(msg.sender != auction.seller, "Seller cannot bid");
        if (auction.highestBid == 0) {
            require(msg.value >= auction.startingBid, "Bid must be at least the starting bid");
        } else {
            require(msg.value > auction.highestBid, "Bid must exceed current highest bid");
        }

        // Refund the previous highest bidder
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        // Update highest bidder and bid
        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;

        emit BidPlaced(tokenId, msg.sender, msg.value);
    }

    /// @notice End an auction and transfer the NFT
    function endAuction(uint256 tokenId) public {
        Auction storage auction = auctions[tokenId];
        require(nftDetails[tokenId].status == SaleStatus.Auction, "NFT is not in auction");
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");
        require(!auction.ended, "Auction already ended");
        require(msg.sender == auction.seller || msg.sender == auction.highestBidder, "Only seller or highest bidder can end the auction");

        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            // Transfer NFT to the highest bidder
            _transfer(address(this), auction.highestBidder, tokenId);
            // Transfer funds to the seller
            payable(auction.seller).transfer(auction.highestBid);
            emit NFTSold(tokenId, auction.seller, auction.highestBidder, auction.highestBid);
        } else {
            // No bids, return NFT to seller
            _transfer(address(this), auction.seller, tokenId);
        }

        // Reset NFT status
        nftDetails[tokenId].status = SaleStatus.NotForSale;

        emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid);
    }

    /// @notice Cancel an auction if no bids have been placed
    function cancelAuction(uint256 tokenId) public {
        Auction storage auction = auctions[tokenId];
        require(nftDetails[tokenId].status == SaleStatus.Auction, "NFT is not in auction");
        require(msg.sender == auction.seller, "Only the seller can cancel");
        require(auction.highestBidder == address(0), "Cannot cancel with bids");
        require(!auction.ended, "Auction already ended");

        auction.ended = true;

        // Return NFT to seller
        _transfer(address(this), auction.seller, tokenId);

        // Reset NFT status
        nftDetails[tokenId].status = SaleStatus.NotForSale;

        emit AuctionCancelled(tokenId);
    }

    /// @notice Debug function to inspect auction and NFT status
    function getAuctionDetails(uint256 tokenId) public view returns (
        address seller,
        uint256 startingBid,
        uint256 highestBid,
        address highestBidder,
        uint256 endTime,
        bool ended,
        SaleStatus status
    ) {
        Auction memory auction = auctions[tokenId];
        NFT memory nft = nftDetails[tokenId];
        return (
            auction.seller,
            auction.startingBid,
            auction.highestBid,
            auction.highestBidder,
            auction.endTime,
            auction.ended,
            nft.status
        );
    }

    // Events
    event NFTMinted(
        address indexed owner,
        uint256 tokenId,
        string tokenURI,
        string title,
        string description,
        string category,
        uint256 price
    );
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTSold(uint256 indexed tokenId, address seller, address buyer, uint256 price);
    event NFTListedForAuction(uint256 indexed tokenId, uint256 startingBid, uint256 duration);
    event BidPlaced(uint256 indexed tokenId, address bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address winner, uint256 winningBid);
    event AuctionCancelled(uint256 indexed tokenId);
}