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
} from "@mui/material";

const NFTGallery = () => {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);
  const [userAddress, setUserAddress] = useState("");

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        setUserAddress(await signer.getAddress());
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        const totalMinted = await contract.getTotalMintedNFTs();
        if (totalMinted.toString() === "0") {
          setNfts([]);
          setLoading(false);
          return;
        }

        let nftList = [];
        for (let i = 1; i <= totalMinted; i++) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const tokenURI = await contract.tokenURI(i);
            if (!tokenURI.startsWith("ipfs://")) continue;

            const metadataURL = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
            const response = await fetch(metadataURL);
            if (!response.ok) throw new Error(`Metadata fetch failed for tokenId ${i}`);

            const metadata = await response.json();
            const owner = await contract.ownerOf(i);
            const nftDetails = await contract.nftDetails(i);
            const status = Number(nftDetails.status); // 0: NotForSale, 1: FixedPrice, 2: Auction
            const priceInEth = ethers.formatEther(nftDetails.price.toString());

            let nftData = {
              id: i,
              name: metadata.name,
              description: metadata.description,
              image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
              category:
                metadata.attributes.find((attr) => attr.trait_type === "Category")?.value ||
                "Unknown",
              price: priceInEth,
              owner,
              status,
              listingType: "fixed", // Default listing type
            };

            // Fetch auction details if NFT is in auction
            if (status === 2) {
              const auction = await contract.auctions(i);
              nftData.auction = {
                startingBid: ethers.formatEther(auction.startingBid),
                highestBid: ethers.formatEther(auction.highestBid),
                endTime: Number(auction.endTime),
                highestBidder: auction.highestBidder,
                ended: auction.ended,
              };
            }

            nftList.push(nftData);
          } catch (err) {
            console.warn(`Skipping tokenId ${i} due to error:`, err);
          }
        }

        setNfts(nftList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [refresh]);

  const handleRefresh = () => {
    setLoading(true);
    setRefresh(!refresh);
  };

  const buyNFT = async (tokenId, price) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const transaction = await contract.buyNFT(tokenId, { value: ethers.parseEther(price) });
      await transaction.wait();

      alert(`Successfully purchased NFT ${tokenId}!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error purchasing NFT:", error);
    }
  };

  const listNFTForSale = async (tokenId, price) => {
    try {
      if (price <= 0) {
        alert("Price must be greater than 0.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const transaction = await contract.listNFTForSale(tokenId, ethers.parseEther(price));
      await transaction.wait();

      alert(`NFT ${tokenId} is now listed for sale at ${price} ETH!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error listing NFT for sale:", error);
    }
  };

  const listNFTForAuction = async (tokenId, startingBid, durationHours) => {
    try {
      if (startingBid <= 0 || durationHours <= 0) {
        alert("Starting bid and duration must be greater than 0.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Approve the contract to transfer the NFT
      const approveTx = await contract.approve(CONTRACT_ADDRESS, tokenId);
      await approveTx.wait();

      // List for auction (duration in seconds)
      const durationSeconds = durationHours * 3600;
      const transaction = await contract.listNFTForAuction(
        tokenId,
        ethers.parseEther(startingBid),
        durationSeconds
      );
      await transaction.wait();

      alert(`NFT ${tokenId} is now listed for auction!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error listing NFT for auction:", error);
    }
  };

  const placeBid = async (tokenId, bidAmount) => {
    try {
      if (bidAmount <= 0) {
        alert("Bid amount must be greater than 0.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const transaction = await contract.bidOnNFT(tokenId, {
        value: ethers.parseEther(bidAmount),
      });
      await transaction.wait();

      alert(`Successfully placed bid on NFT ${tokenId}!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error placing bid:", error);
    }
  };

  const endAuction = async (tokenId) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const transaction = await contract.endAuction(tokenId);
      await transaction.wait();

      alert(`Auction for NFT ${tokenId} has ended!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error ending auction:", error);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "20px" }}>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <CircularProgress />
        </div>
      ) : nfts.length > 0 ? (
        <Grid container spacing={3}>
          {nfts.map((nft) => (
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

                  {/* Ownership or Auction Status */}
                  {nft.status === 2 ? (
                    <Typography variant="subtitle2">
                      <strong>Status:</strong> In Auction
                    </Typography>
                  ) : (
                    <Typography variant="subtitle2">
                      <strong>Owner:</strong> {nft.owner}
                    </Typography>
                  )}

                  {/* Fixed Price Display */}
                  {nft.status === 1 && (
                    <Typography variant="subtitle2">
                      <strong>Price:</strong> {nft.price} ETH
                    </Typography>
                  )}

                  {/* Auction Details Display */}
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

                  {/* Listing Options (if owner and not for sale) */}
                  {userAddress === nft.owner && nft.status === 0 && (
                    <div style={{ marginTop: "10px" }}>
                      <Select
                        value={nft.listingType || "fixed"}
                        onChange={(e) => {
                          nft.listingType = e.target.value;
                          setNfts([...nfts]);
                        }}
                        size="small"
                        fullWidth
                      >
                        <MenuItem value="fixed">Fixed Price</MenuItem>
                        <MenuItem value="auction">Auction</MenuItem>
                      </Select>
                      {nft.listingType === "fixed" ? (
                        <TextField
                          label="Set Price (ETH)"
                          type="number"
                          variant="outlined"
                          size="small"
                          sx={{ width: "100%", marginTop: "10px" }}
                          onChange={(e) => (nft.newPrice = e.target.value)}
                        />
                      ) : (
                        <>
                          <TextField
                            label="Starting Bid (ETH)"
                            type="number"
                            variant="outlined"
                            size="small"
                            sx={{ width: "100%", marginTop: "10px" }}
                            onChange={(e) => (nft.startingBid = e.target.value)}
                          />
                          <TextField
                            label="Duration (hours)"
                            type="number"
                            variant="outlined"
                            size="small"
                            sx={{ width: "100%", marginTop: "10px" }}
                            onChange={(e) => (nft.duration = e.target.value)}
                          />
                        </>
                      )}
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        sx={{ marginTop: "10px" }}
                        onClick={() => {
                          if (nft.listingType === "fixed") {
                            listNFTForSale(nft.id, nft.newPrice);
                          } else {
                            listNFTForAuction(nft.id, nft.startingBid, nft.duration);
                          }
                        }}
                      >
                        List NFT
                      </Button>
                    </div>
                  )}

                  {/* Buy Button (if fixed price and not owner) */}
                  {nft.status === 1 && userAddress !== nft.owner && (
                    <Button
                      variant="contained"
                      color="secondary"
                      fullWidth
                      onClick={() => buyNFT(nft.id, nft.price)}
                      sx={{ marginTop: "10px" }}
                    >
                      Buy Now
                    </Button>
                  )}

                  {/* Bid Input (if auction and not ended) */}
                  {nft.status === 2 && Date.now() / 1000 < nft.auction.endTime && (
                    <div style={{ marginTop: "10px" }}>
                      {userAddress === nft.auction.highestBidder ? (
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
                          >
                            Place Bid
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {/* End Auction Button (if auction ended and not yet finalized) */}
                  {nft.status === 2 && Date.now() / 1000 >= nft.auction.endTime && !nft.auction.ended && (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={() => endAuction(nft.id)}
                      sx={{ marginTop: "10px" }}
                    >
                      End Auction
                    </Button>
                  )}

                  {/* Auction Ended Message */}
                  {nft.status === 2 && nft.auction.ended && (
                    <Typography variant="subtitle2" sx={{ marginTop: "10px" }}>
                      Auction Ended
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="h6" align="center">
          No NFTs found.
        </Typography>
      )}
    </div>
  );
};

export default NFTGallery;