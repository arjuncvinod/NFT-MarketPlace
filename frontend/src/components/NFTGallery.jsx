import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config";
import {
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import toast from "react-hot-toast"; // Import only toast

const NFTGallery = () => {
  const [nfts, setNfts] = useState([]);
  const [filteredNfts, setFilteredNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [userAddress, setUserAddress] = useState("");
  const [transactionStates, setTransactionStates] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [listingTypeFilter, setListingTypeFilter] = useState("");

  const categories = [
    "Digital Art",
    "Gaming Assets",
    "Music & Audio",
    "Video & Animation",
    "Sports & Collectibles",
    "Virtual Real Estate",
    "Domain Names",
    "Utility & Memberships",
    "Photography",
    "Fashion & Wearables",
  ];

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!window.ethereum) {
        toast.error("Please install MetaMask!");
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = (await signer.getAddress()).toLowerCase();
        setUserAddress(address);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        const totalMinted = await contract.getTotalMintedNFTs();
        if (totalMinted.toString() === "0") {
          setNfts([]);
          setFilteredNfts([]);
          setLoading(false);
          return;
        }

        let nftList = [];
        const currentTime = Math.floor(Date.now() / 1000);

        for (let i = 1; i <= totalMinted; i++) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const tokenURI = await contract.tokenURI(i);
            if (!tokenURI.startsWith("ipfs://")) continue;

            const nftDetails = await contract.nftDetails(i);
            const status = Number(nftDetails.status);

            if (status !== 1 && status !== 2) continue;

            let auction = null;
            if (status === 2) {
              auction = await contract.auctions(i);
              if (auction.ended || currentTime >= Number(auction.endTime)) continue;
            }

            const metadataURL = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
            const response = await fetch(metadataURL);
            if (!response.ok) throw new Error(`Metadata fetch failed for tokenId ${i}`);

            const metadata = await response.json();
            const owner = (await contract.ownerOf(i)).toLowerCase();
            const priceInEth = ethers.formatEther(nftDetails.price.toString());

            let nftData = {
              id: i,
              name: metadata.name,
              description: metadata.description,
              image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
              category:
                metadata.attributes.find((attr) => attr.trait_type === "Category")?.value || "Unknown",
              price: priceInEth,
              owner,
              status,
              listingType: status === 1 ? "Fixed Price" : "Auction",
            };

            if (status === 2 && auction) {
              nftData.auction = {
                startingBid: ethers.formatEther(auction.startingBid),
                highestBid: ethers.formatEther(auction.highestBid),
                endTime: Number(auction.endTime),
                highestBidder: auction.highestBidder.toLowerCase(),
                ended: auction.ended,
                seller: auction.seller.toLowerCase(),
              };
            }

            nftList.push(nftData);
          } catch (err) {
            console.warn(`Skipping tokenId ${i} due to error:`, err);
          }
        }

        setNfts(nftList);
        setFilteredNfts(nftList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [refresh]);

  useEffect(() => {
    let filtered = [...nfts];

    if (searchQuery) {
      filtered = filtered.filter(
        (nft) =>
          nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          nft.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((nft) => nft.category === selectedCategory);
    }

    if (listingTypeFilter) {
      filtered = filtered.filter((nft) => nft.listingType === listingTypeFilter);
    }

    if (sortOrder === "lowToHigh") {
      filtered = filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOrder === "highToLow") {
      filtered = filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    setFilteredNfts(filtered);
  }, [searchQuery, selectedCategory, sortOrder, listingTypeFilter, nfts]);

  const setTransactionState = (tokenId, action, state) => {
    setTransactionStates((prev) => ({
      ...prev,
      [`${tokenId}-${action}`]: state,
    }));
  };

  const isTransactionInProgress = (tokenId, action) => {
    return !!transactionStates[`${tokenId}-${action}`];
  };

  const buyNFT = async (tokenId, price) => {
    try {
      setTransactionState(tokenId, "buy", true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const transaction = await contract.buyNFT(tokenId, { value: ethers.parseEther(price) });
      await transaction.wait();

      toast.success(`Successfully purchased NFT`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error purchasing NFT:", error);
      toast.error("Failed to purchase NFT. Check the console for details.");
    } finally {
      setTransactionState(tokenId, "buy", false);
    }
  };

  const placeBid = async (tokenId, bidAmount) => {
    try {
      if (bidAmount <= 0) {
        toast.error("Bid amount must be greater than 0.");
        return;
      }
      setTransactionState(tokenId, "bid", true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const transaction = await contract.bidOnNFT(tokenId, {
        value: ethers.parseEther(bidAmount),
      });
      await transaction.wait();

      toast.success(`Bid placed on NFT ${tokenId}!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error placing bid:", error);
      toast.error("Failed to place bid. Check the console for details.");
    } finally {
      setTransactionState(tokenId, "bid", false);
    }
  };

  const endAuction = async (tokenId) => {
    try {
      setTransactionState(tokenId, "endAuction", true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      await provider.getBlockNumber();
      const transaction = await contract.endAuction(tokenId);
      await transaction.wait();

      toast.success(`Auction for NFT ${tokenId} has ended!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error ending auction:", error);
      const reason = error.reason || error.message || "Unknown error";
      if (reason.includes("Auction does not exist")) {
        toast.error("The auction does not exist for this NFT.");
      } else if (reason.includes("NFT is not in auction")) {
        toast.error("This NFT is not currently in an auction.");
      } else if (reason.includes("Auction has not ended yet")) {
        toast.error("The auction has not ended yet. Please wait until the end time.");
      } else if (reason.includes("Auction already ended")) {
        toast.error("The auction has already been finalized.");
      } else if (reason.includes("Only seller or highest bidder")) {
        toast.error("You are not authorized to end this auction. Only the seller or highest bidder can do so.");
      } else {
        toast.error(`Failed to end auction: ${reason}. Try refreshing or performing another transaction first.`);
      }
    } finally {
      setTransactionState(tokenId, "endAuction", false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "20px" }}>
      <Grid container spacing={2} sx={{ marginBottom: "20px" }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            label="Search NFTs"
            variant="outlined"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#757575",
                },
                "&:hover fieldset": {
                  borderColor: "#1976d2",
                },
              },
              "& .MuiInputBase-input": {
                color: "#1976d2",
              },
              "& .MuiInputLabel-root": {
                color: "#757575",
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#1976d2 ",
              },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl
            fullWidth
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#757575",
              },
              "& .MuiSelect-select": {
                color: "#757575",
              },
              "& .MuiInputLabel-root": {
                color: "#757575",
              },
            }}
          >
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl
            fullWidth
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#757575",
              },
              "& .MuiSelect-select": {
                color: "#757575",
              },
              "& .MuiInputLabel-root": {
                color: "#757575",
              },
            }}
          >
            <InputLabel>Sort By Price</InputLabel>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              label="Sort By Price"
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="lowToHigh">Price: Low to High</MenuItem>
              <MenuItem value="highToLow">Price: High to Low</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl
            fullWidth
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#757575",
              },
              "& .MuiSelect-select": {
                color: "#757575",
              },
              "& .MuiInputLabel-root": {
                color: "#757575",
              },
            }}
          >
            <InputLabel>Listing Type</InputLabel>
            <Select
              value={listingTypeFilter}
              onChange={(e) => setListingTypeFilter(e.target.value)}
              label="Listing Type"
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="Fixed Price">Fixed Price</MenuItem>
              <MenuItem value="Auction">Auction</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <CircularProgress />
        </div>
      ) : filteredNfts.length > 0 ? (
        <Grid container spacing={3}>
          {filteredNfts.map((nft) => (
            <Grid item key={nft.id} xs={12} sm={6} md={4} lg={3}>
              <Card
                sx={{
                  maxWidth: 345,
                  borderRadius: 2,
                  boxShadow: 3,
                  transition: "0.3s",
                  "&:hover": { boxShadow: 6 },
                }}
              >
                <CardMedia component="img" height="200" image={nft.image} alt={nft.name} />
                <CardContent>
                  <Typography variant="h6">{nft.name}</Typography>
                  <Typography variant="subtitle2">
                    <strong>Category:</strong> {nft.category}
                  </Typography>

                  {nft.status === 2 ? (
                    <Typography variant="subtitle2">
                      <strong>Status:</strong> In Auction
                    </Typography>
                  ) : (
                    <Typography variant="subtitle2">
                      <strong>Owner:</strong> {nft.owner}
                    </Typography>
                  )}

                  {nft.status === 1 && (
                    <Typography variant="subtitle2">
                      <strong>Price:</strong> {nft.price} ETH
                    </Typography>
                  )}

                  {nft.status === 2 && (
                    <div>
                      <Typography variant="subtitle2">
                        <strong>Auction</strong>
                      </Typography>
                      <Typography variant="subtitle2">
                        <strong>Starting Bid:</strong> {nft.auction.startingBid} ETH
                      </Typography>
                      <Typography variant="subtitle2">
                        <strong>Current Bid:</strong> {nft.auction.highestBid} ETH
                      </Typography>
                      <Typography variant="subtitle2">
                        <strong>Ends at:</strong>{" "}
                        {new Date(nft.auction.endTime * 1000).toLocaleString()}
                      </Typography>
                    </div>
                  )}

                  {nft.status === 1 && userAddress !== nft.owner && (
                    <Button
                      variant="contained"
                      color="secondary"
                      fullWidth
                      onClick={() => buyNFT(nft.id, nft.price)}
                      sx={{ marginTop: "10px" }}
                      disabled={isTransactionInProgress(nft.id, "buy")}
                    >
                      {isTransactionInProgress(nft.id, "buy") ? <CircularProgress size={24} /> : "Buy Now"}
                    </Button>
                  )}

                  {nft.status === 2 && Date.now() / 1000 < nft.auction.endTime && (
                    <div style={{ marginTop: "10px" }}>
                      {userAddress === nft.auction.seller ? (
                        <Typography variant="subtitle2">
                          You are the seller
                        </Typography>
                      ) : userAddress === nft.auction.highestBidder ? (
                        <Typography variant="subtitle2">
                          You are the current highest bidder!
                        </Typography>
                      ) : (
                        <>
                          <TextField
                            label="Bid Amount (ETH)"
                            type="number"
                            variant="outlined"
                            size="small"
                            sx={{ width: "100%", marginBottom: "10px" }}
                            onChange={(e) => (nft.bidAmount = e.target.value)}
                          />
                          <Button
                            variant="contained"
                            color="secondary"
                            fullWidth
                            onClick={() => placeBid(nft.id, nft.bidAmount)}
                            disabled={isTransactionInProgress(nft.id, "bid")}
                          >
                            {isTransactionInProgress(nft.id, "bid") ? <CircularProgress size={24} /> : "Place Bid"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {nft.status === 2 && Date.now() / 1000 >= nft.auction.endTime && !nft.auction.ended && (
                    (userAddress === nft.auction.seller || userAddress === nft.auction.highestBidder) ? (
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={() => endAuction(nft.id)}
                        sx={{ marginTop: "10px" }}
                        disabled={isTransactionInProgress(nft.id, "endAuction")}
                      >
                        {isTransactionInProgress(nft.id, "endAuction") ? (
                          <CircularProgress size={24} />
                        ) : (
                          "End Auction"
                        )}
                      </Button>
                    ) : (
                      <Typography variant="subtitle2" sx={{ marginTop: "10px" }}>
                        Only the seller or highest bidder can end the auction.
                      </Typography>
                    )
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="h6" align="center">
          No NFTs are currently listed for sale or auction.
        </Typography>
      )}
    </div>
  );
};

export default NFTGallery;