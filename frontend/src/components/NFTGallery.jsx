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
  const [transactionStates, setTransactionStates] = useState({}); // Track loading per tokenId and action

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
        setUserAddress((await signer.getAddress()).toLowerCase());
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
            const owner = (await contract.ownerOf(i)).toLowerCase();
            const nftDetails = await contract.nftDetails(i);
            const status = Number(nftDetails.status);
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
              listingType: "fixed",
            };

            if (status === 2) {
              const auction = await contract.auctions(i);
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
        setLoading(false);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
        setLoading(false);
      }
    };

    fetchNFTs();
  }, [refresh]);

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

      alert(`Successfully purchased NFT ${tokenId}!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error purchasing NFT:", error);
      alert("Failed to purchase NFT. Check the console for details.");
    } finally {
      setTransactionState(tokenId, "buy", false);
    }
  };

  const listNFTForSale = async (tokenId, price) => {
    try {
      if (price <= 0) {
        alert("Price must be greater than 0.");
        return;
      }
      setTransactionState(tokenId, "listForSale", true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const transaction = await contract.listNFTForSale(tokenId, ethers.parseEther(price));
      await transaction.wait();

      alert(`NFT ${tokenId} listed for sale at ${price} ETH!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error listing NFT:", error);
      alert("Failed to list NFT. Check the console for details.");
    } finally {
      setTransactionState(tokenId, "listForSale", false);
    }
  };

  const listNFTForAuction = async (tokenId, startingBid, durationHours) => {
    try {
      if (startingBid <= 0 || durationHours <= 0) {
        alert("Starting bid and duration must be greater than 0.");
        return;
      }
      setTransactionState(tokenId, "listForAuction", true);
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
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error listing NFT for auction:", error);
      alert("Failed to list NFT for auction. Check the console for details.");
    } finally {
      setTransactionState(tokenId, "listForAuction", false);
    }
  };

  const placeBid = async (tokenId, bidAmount) => {
    try {
      if (bidAmount <= 0) {
        alert("Bid amount must be greater than 0.");
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

      alert(`Bid placed on NFT ${tokenId}!`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error placing bid:", error);
      alert("Failed to place bid. Check the console for details.");
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

      await provider.getBlockNumber(); // Force state refresh

      const transaction = await contract.endAuction(tokenId);
      await transaction.wait();

      alert(`Auction for NFT ${tokenId} has ended!`);
      setRefresh(!refresh);
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
      setTransactionState(tokenId, "endAuction", false);
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
                        disabled={isTransactionInProgress(nft.id, "listForSale") || isTransactionInProgress(nft.id, "listForAuction")}
                      >
                        {isTransactionInProgress(nft.id, "listForSale") || isTransactionInProgress(nft.id, "listForAuction") ? (
                          <CircularProgress size={24} />
                        ) : (
                          "List NFT"
                        )}
                      </Button>
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
                        {isTransactionInProgress(nft.id, "endAuction") ? <CircularProgress size={24} /> : "End Auction"}
                      </Button>
                    ) : (
                      <Typography variant="subtitle2" sx={{ marginTop: "10px" }}>
                        Only the seller or highest bidder can end the auction.
                      </Typography>
                    )
                  )}

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