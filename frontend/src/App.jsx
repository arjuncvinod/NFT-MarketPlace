import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./config";
import NFTGallery from "./components/NFTGallery";
import NFTUploader from "./components/NFTUploader";
import { Button } from "@mui/material";

function App() {
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
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>NFT Marketplace</h1>

      {account ? (
        <p><strong>Connected Wallet:</strong> {account}</p>
      ) : (
        <Button variant="contained" color="secondary" onClick={connectWallet} style={{ margin: "10px" }}>
          Connect Wallet
        </Button>
      )}

      <NFTUploader />
      <NFTGallery />
    </div>
  );
}

export default App;
