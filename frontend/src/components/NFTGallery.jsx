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
} from "@mui/material";

const NFTGallery = () => {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(false);

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
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        const totalMinted = await contract.totalSupply();
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

            // ✅ Extract Price with proper conversion
            const priceAttribute = metadata.attributes.find((attr) => attr.trait_type === "Price");
            const priceInEth = priceAttribute
              ? ethers.formatEther(ethers.parseUnits(priceAttribute.value, "ether"))
              : "0";

            // ✅ Extract Category
            const categoryAttribute = metadata.attributes.find((attr) => attr.trait_type === "Category");
            const category = categoryAttribute ? categoryAttribute.value : "Unknown";

            nftList.push({
              id: i,
              name: metadata.name,
              description: metadata.description,
              image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
              category,
              price: priceInEth,
              owner,
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

  return (
    <div style={{ maxWidth: "1200px", margin: "auto", padding: "20px" }}>
      {/* Refresh Button */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<Refresh />}
        onClick={handleRefresh}
        sx={{ marginBottom: "20px" }}
      >
        Refresh NFTs
      </Button>

      {/* Loading State */}
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
                  <Typography variant="h6" component="div" gutterBottom>
                    {nft.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ height: "50px", overflow: "hidden" }}>
                    {nft.description}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ marginTop: "10px" }}>
                    <strong>Category:</strong> {nft.category}
                  </Typography>
                  <Typography variant="subtitle2">
                    <strong>Price:</strong> {nft.price} ETH
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      marginTop: "10px",
                      fontSize: "0.8rem",
                      fontFamily: "monospace",
                      color: "#007bff",
                      wordBreak: "break-word",
                    }}
                  >
                    <strong>Owner:</strong> {nft.owner.substring(0, 6)}...{nft.owner.substring(nft.owner.length - 4)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="h6" color="text.secondary" align="center" sx={{ marginTop: "20px" }}>
          No NFTs found.
        </Typography>
      )}
    </div>
  );
};

export default NFTGallery;
