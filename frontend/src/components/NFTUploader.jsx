import { useState } from "react";
import { ethers } from "ethers";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../utils/pinataUpload";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config";
import {
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Box,
} from "@mui/material";

const NFTUploader = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const mintNFT = async (event) => {
    event.preventDefault();

    if (!file || !title || !description || !category || !price) {
      alert("⚠️ Please fill all fields and upload an image.");
      return;
    }

    if (isNaN(price) || Number(price) <= 0) {
      alert("⚠️ Price must be a valid positive number.");
      return;
    }

    setLoading(true);

    try {
      console.log("🔹 Uploading Image to IPFS...");
      const imageURI = await uploadFileToIPFS(file);
      if (!imageURI) throw new Error("❌ Failed to upload NFT image");

      console.log("✅ Image Uploaded:", imageURI);

      console.log("🔹 Uploading Metadata to IPFS...");
      const metadata = {
        name: title,
        description,
        image: imageURI,
        attributes: [
          { trait_type: "Category", value: category },
          { trait_type: "Price", value: price },
        ],
      };

      const metadataURI = await uploadJSONToIPFS(metadata);
      if (!metadataURI) throw new Error("❌ Failed to upload NFT metadata");

      console.log("✅ Metadata Uploaded:", metadataURI);

      if (!window.ethereum) throw new Error("❌ MetaMask not detected!");

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      console.log("🔹 Minting NFT on Blockchain...");
      const tx = await contract.mintNFT(
        metadataURI,
        title,
        description,
        category,
        ethers.parseEther(price) // Convert ETH to Wei
      );

      await tx.wait();
      alert("✅ NFT Minted Successfully!");

      // Reset form after minting
      setFile(null);
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("");
    } catch (error) {
      console.error("❌ Error Minting NFT:", error);
      alert(error.message || "NFT Minting Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 450, mx: "auto", mt: 4, p: 3, boxShadow: 3, borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
          Mint Your NFT
        </Typography>

        <form onSubmit={mintNFT}>
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ width: "100%", padding: "10px", border: "1px solid #ccc", borderRadius: 4 }}
            />
          </Box>

          <TextField fullWidth label="Title" variant="outlined" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Description" multiline rows={3} variant="outlined" value={description} onChange={(e) => setDescription(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Category" variant="outlined" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth type="number" label="Price (ETH)" variant="outlined" value={price} onChange={(e) => setPrice(e.target.value)} inputProps={{ step: "0.0001", min: "0.0001" }} sx={{ mb: 2 }} />

          <Button type="submit" fullWidth variant="contained" color="primary" disabled={loading} sx={{ mt: 2 }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : "Mint NFT"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NFTUploader;
