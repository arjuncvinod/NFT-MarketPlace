import { useState } from "react";
import { ethers } from "ethers";
import { Button, Typography, Grid, Card, CardMedia, CardContent, Container } from "@mui/material";
import "./Home.css";
import img1 from "../assets/NFTS/CryptoPunk.png";
import img2 from "../assets/NFTS/bored-ape.png";
import img3 from "../assets/NFTS/doodle.jpg";
import img4 from "../assets/NFTS/Meebit.png";
function Home() {
  const [account, setAccount] = useState(null);

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
      }

      const providerInstance = new ethers.BrowserProvider(window.ethereum);
      await providerInstance.send("eth_requestAccounts", []);
      const signer = await providerInstance.getSigner();
      const accountAddress = await signer.getAddress();

      setAccount(accountAddress);
      console.log("Connected Account:", accountAddress);
    } catch (error) {
      console.error("Wallet Connection Failed:", error);
    }
  };

  return (
    <div className="home-container">
      

      {/* Hero Section */}
      <div className="hero-section">
        <h1>Discover, Mint & Trade Unique NFTs</h1>
        <p>Join the decentralized revolution and explore a world of digital assets.</p>
        <div className="hero-buttons">
          <Button variant="contained" color="primary" onClick={connectWallet}>
            {account ? "Connected: " + account.substring(0, 6) + "..." + account.slice(-4) : "Connect Wallet"}
          </Button>
          <Button variant="outlined" color="secondary">
            Explore NFTs
          </Button>
        </div>
      </div>

      {/* Featured NFTs Section */}
      <Container>
        <div className="featured-nfts">
          <h2>Featured NFTs</h2>
          <Grid container spacing={3} justifyContent="center">
            {[
              { id: 1, img: img1, title: "CryptoPunk #1" },
              { id: 2, img: img2, title: "Bored Ape #42" },
              { id: 3, img: img3, title: "Doodle #99" },
              { id: 4, img: img4, title: "Meebit #50" }
            ].map((nft) => (
              <Grid item key={nft.id} xs={12} sm={6} md={3}>
                <Card className="nft-card">
                  <CardMedia component="img" image={nft.img} alt={nft.title} className="nft-image" />
                  <CardContent>
                    <Typography variant="h6">{nft.title}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </div>
      </Container>
    </div>
  );
}

export default Home;
