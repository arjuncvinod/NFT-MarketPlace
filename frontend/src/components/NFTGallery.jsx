import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config";
import { Refresh } from "@mui/icons-material";
import {
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Grid,
  CircularProgress,
  TextField,
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

            const priceInEth = ethers.formatEther(nftDetails.price.toString());

            nftList.push({
              id: i,
              name: metadata.name,
              description: metadata.description,
              image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
              category: metadata.attributes.find(attr => attr.trait_type === "Category")?.value || "Unknown",
              price: priceInEth,
              owner,
              isForSale: nftDetails.isForSale,
            });
          } catch (err) {
            console.warn(`Skipping tokenId ${i} due to error:`, err);
          }
        }

        setNfts([...nftList]);
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

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "20px" }}>
      <Button
        variant="contained"
        color="primary"
        startIcon={<Refresh />}
        onClick={handleRefresh}
        sx={{ marginBottom: "20px" }}
      >
        Refresh NFTs
      </Button>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <CircularProgress />
        </div>
      ) : nfts.length > 0 ? (
        <Grid container spacing={3}>
          {nfts.map((nft) => (
            <Grid item key={nft.id} xs={12} sm={6} md={4} lg={3}>
              <Card sx={{ maxWidth: 345, borderRadius: 2, boxShadow: 3, transition: "0.3s", "&:hover": { boxShadow: 6 } }}>
                <CardMedia component="img" height="200" image={nft.image} alt={nft.name} />
                <CardContent>
                  <Typography variant="h6">{nft.name}</Typography>
                  <Typography variant="subtitle2"><strong>Category:</strong> {nft.category}</Typography>
                  <Typography variant="subtitle2"><strong>Owner:</strong> {nft.owner}</Typography>
                  <Typography variant="subtitle2"><strong>Price:</strong> {nft.price} ETH</Typography>

                  {/* Sell NFT (Only if user owns it) */}
                  {userAddress === nft.owner && !nft.isForSale && (
                    <div style={{ marginTop: "10px" }}>
                      <TextField
                        label="Set Price (ETH)"
                        type="number"
                        variant="outlined"
                        size="small"
                        sx={{ width: "100%", marginBottom: "10px" }}
                        onChange={(e) => (nft.newPrice = e.target.value)}
                      />
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        onClick={() => listNFTForSale(nft.id, nft.newPrice)}
                      >
                        Sell NFT
                      </Button>
                    </div>
                  )}

                  {/* Buy NFT (Only if it's for sale and user is not the owner) */}
                  {nft.isForSale && userAddress !== nft.owner && (
                    <Button variant="contained" color="secondary" fullWidth onClick={() => buyNFT(nft.id, nft.price)}>
                      Buy Now
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="h6" align="center">No NFTs found.</Typography>
      )}
    </div>
  );
};

export default NFTGallery;
