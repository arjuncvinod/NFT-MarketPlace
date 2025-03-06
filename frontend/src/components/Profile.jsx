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

const Profile = () => {
  const [ownedNfts, setOwnedNfts] = useState([]);
  const [auctionNfts, setAuctionNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userAddress, setUserAddress] = useState("");
  const [transactionInProgress, setTransactionInProgress] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
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
          setOwnedNfts([]);
          setAuctionNfts([]);
          setLoading(false);
          return;
        }

        let ownedList = [];
        let auctionList = [];

        for (let i = 1; i <= totalMinted; i++) {
          try {
            const owner = (await contract.ownerOf(i)).toLowerCase();
            const nftDetails = await contract.nftDetails(i);
            const status = Number(nftDetails.status);

            if (owner === address) {
              const tokenURI = await contract.tokenURI(i);
              const metadataURL = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
              const response = await fetch(metadataURL);
              if (!response.ok) throw new Error(`Metadata fetch failed for tokenId ${i}`);
              const metadata = await response.json();

              ownedList.push({
                id: i,
                name: metadata.name,
                image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
                description: metadata.description,
                category: metadata.attributes.find(attr => attr.trait_type === "Category")?.value || "Unknown",
                status: status,
                listingType: "fixed", // Default listing type
              });
            }

            if (status === 2) {
              const auction = await contract.auctions(i);
              const seller = auction.seller.toLowerCase();
              const highestBidder = auction.highestBidder.toLowerCase();

              if (seller === address || highestBidder === address) {
                const tokenURI = await contract.tokenURI(i);
                const metadataURL = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
                const response = await fetch(metadataURL);
                if (!response.ok) throw new Error(`Metadata fetch failed for tokenId ${i}`);
                const metadata = await response.json();

                auctionList.push({
                  id: i,
                  name: metadata.name,
                  image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
                  description: metadata.description,
                  category: metadata.attributes.find(attr => attr.trait_type === "Category")?.value || "Unknown",
                  auction: {
                    startingBid: ethers.formatEther(auction.startingBid),
                    highestBid: ethers.formatEther(auction.highestBid),
                    endTime: Number(auction.endTime),
                    highestBidder,
                    seller,
                    ended: auction.ended, // Include ended status
                  },
                });
              }
            }
          } catch (err) {
            console.warn(`Skipping tokenId ${i} due to error:`, err);
          }
        }

        setOwnedNfts(ownedList);
        setAuctionNfts(auctionList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const listNFTForSale = async (tokenId, price) => {
    try {
      if (price <= 0) {
        alert("Price must be greater than 0.");
        return;
      }
      setTransactionInProgress(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const transaction = await contract.listNFTForSale(tokenId, ethers.parseEther(price));
      await transaction.wait();

      alert(`NFT ${tokenId} listed for sale at ${price} ETH!`);
      window.location.reload();
    } catch (error) {
      console.error("Error listing NFT for sale:", error);
      alert("Failed to list NFT for sale. Check the console for details.");
    } finally {
      setTransactionInProgress(false);
    }
  };

  const listNFTForAuction = async (tokenId, startingBid, durationHours) => {
    try {
      if (startingBid <= 0 || durationHours <= 0) {
        alert("Starting bid and duration must be greater than 0.");
        return;
      }
      setTransactionInProgress(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const approveTx = await contract.approve(CONTRACT_ADDRESS, tokenId);
      await approveTx.wait();

      const durationSeconds = durationHours * 3600;
      const transaction = await contract.listNFTForAuction(
        tokenId,
        ethers.parseEther(startingBid),
        durationSeconds
      );
      await transaction.wait();

      alert(`NFT ${tokenId} listed for auction!`);
      window.location.reload();
    } catch (error) {
      console.error("Error listing NFT for auction:", error);
      alert("Failed to list NFT for auction. Check the console for details.");
    } finally {
      setTransactionInProgress(false);
    }
  };

  const endAuction = async (tokenId) => {
    try {
      setTransactionInProgress(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Force a state refresh to sync provider
      await provider.getBlockNumber();

      const transaction = await contract.endAuction(tokenId);
      await transaction.wait();

      alert(`Auction for NFT ${tokenId} has ended!`);
      window.location.reload();
    } catch (error) {
      console.error("Error ending auction:", error);
      const reason = error.reason || error.message || "Unknown error";
      if (reason.includes("Auction does not exist")) {
        alert("The auction does not exist for this NFT.");
      } else if (reason.includes("NFT is not in auction")) {
        alert("This NFT is not currently in an auction.");
      } else if (reason.includes("Auction has not ended yet")) {
        alert("The auction has not ended yet. Please wait until the end time.");
      } else if (reason.includes("Auction already ended")) {
        alert("The auction has already been finalized.");
      } else if (reason.includes("Only seller or highest bidder")) {
        alert("You are not authorized to end this auction. Only the seller or highest bidder can do so.");
      } else {
        alert(`Failed to end auction: ${reason}. Try refreshing or performing another transaction first.`);
      }
    } finally {
      setTransactionInProgress(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "20px" }}>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <CircularProgress />
        </div>
      ) : (
        <>
          {/* Section for Owned NFTs */}
          <Typography variant="h4" gutterBottom>
            Your NFTs
          </Typography>
          {ownedNfts.length > 0 ? (
            <Grid container spacing={3}>
              {ownedNfts.map((nft) => (
                <Grid item key={nft.id} xs={12} sm={6} md={4} lg={3}>
                  <Card sx={{ maxWidth: 345, borderRadius: 2, boxShadow: 3 }}>
                    <CardMedia component="img" height="200" image={nft.image} alt={nft.name} />
                    <CardContent>
                      <Typography variant="h6">{nft.name}</Typography>
                      <Typography variant="subtitle2"><strong>Category:</strong> {nft.category}</Typography>
                      <Typography variant="body2">{nft.description}</Typography>

                      {/* Listing Options (if NFT is not listed) */}
                      {nft.status === 0 && (
                        <div style={{ marginTop: "10px" }}>
                          <Select
                            value={nft.listingType || "fixed"}
                            onChange={(e) => {
                              nft.listingType = e.target.value;
                              setOwnedNfts([...ownedNfts]);
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
                            disabled={transactionInProgress}
                          >
                            {transactionInProgress ? <CircularProgress size={24} /> : "List NFT"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography variant="h6" align="center">{"You don't own any NFTs."}</Typography>
          )}

          {/* Section for Auction NFTs */}
          <Typography variant="h4" gutterBottom style={{ marginTop: "40px" }}>
            Your Auctions
          </Typography>
          {auctionNfts.length > 0 ? (
            <Grid container spacing={3}>
              {auctionNfts.map((nft) => (
                <Grid item key={nft.id} xs={12} sm={6} md={4} lg={3}>
                  <Card sx={{ maxWidth: 345, borderRadius: 2, boxShadow: 3 }}>
                    <CardMedia component="img" height="200" image={nft.image} alt={nft.name} />
                    <CardContent>
                      <Typography variant="h6">{nft.name}</Typography>
                      <Typography variant="subtitle2"><strong>Category:</strong> {nft.category}</Typography>
                      <Typography variant="body2">{nft.description}</Typography>
                      <Typography variant="subtitle2"><strong>Starting Bid:</strong> {nft.auction.startingBid} ETH</Typography>
                      <Typography variant="subtitle2"><strong>Current Bid:</strong> {nft.auction.highestBid} ETH</Typography>
                      <Typography variant="subtitle2"><strong>Ends at:</strong> {new Date(nft.auction.endTime * 1000).toLocaleString()}</Typography>
                      {nft.auction.seller === userAddress && (
                        <Typography variant="subtitle2"><strong>Role:</strong> Seller</Typography>
                      )}
                      {nft.auction.highestBidder === userAddress && (
                        <Typography variant="subtitle2"><strong>Role:</strong> Highest Bidder</Typography>
                      )}

                      {/* End Auction Button */}
                      {Date.now() / 1000 >= nft.auction.endTime && !nft.auction.ended && (
                        (userAddress === nft.auction.seller || userAddress === nft.auction.highestBidder) ? (
                          <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={() => endAuction(nft.id)}
                            sx={{ marginTop: "10px" }}
                            disabled={transactionInProgress}
                          >
                            {transactionInProgress ? <CircularProgress size={24} /> : "End Auction"}
                          </Button>
                        ) : (
                          <Typography variant="subtitle2" sx={{ marginTop: "10px" }}>
                            Only the seller or highest bidder can end the auction.
                          </Typography>
                        )
                      )}
                      {nft.auction.ended && (
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
            <Typography variant="h6" align="center">You are not involved in any auctions.</Typography>
          )}
        </>
      )}
    </div>
  );
};

export default Profile;