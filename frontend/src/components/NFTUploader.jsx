import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { ethers } from "ethers";
import { uploadFileToIPFS, uploadJSONToIPFS } from "../utils/pinataUpload";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config";
import { Card, CardContent, TextField, Button, CircularProgress, Typography, Box } from "@mui/material";
import { toast } from "react-hot-toast"; // Import react-hot-toast

const NFTUploader = () => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Initialize navigate
  const toastId = "nftToast"; // Common toast ID

  const mintNFT = async (event) => {
    event.preventDefault();

    if (!file || !title || !description || !category || !price) {
      toast.error("Please fill all fields and upload an image.", { id: toastId });
      return;
    }

    if (isNaN(price) || Number(price) <= 0) {
      toast.error("Price must be a valid positive number.", { id: toastId });
      return;
    }

    setLoading(true);
    toast.loading("Uploading image to IPFS...", { id: toastId });

    try {
      const imageURI = await uploadFileToIPFS(file);
      if (!imageURI) throw new Error("❌ Failed to upload NFT image");

      toast.success("Image Uploaded!", { id: toastId });
      toast.loading("Uploading metadata to IPFS...", { id: toastId });

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

      toast.success("Metadata Uploaded!", { id: toastId });

      if (!window.ethereum) throw new Error("❌ MetaMask not detected!");

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      toast.loading("Minting NFT on Blockchain...", { id: toastId });

      const tx = await contract.mintNFT(
        metadataURI,
        title,
        description,
        category,
        ethers.parseEther(price) // Convert ETH to Wei
      );

      await tx.wait();

      toast.success("NFT Minted Successfully! 🎉", { id: toastId });

      // Reset form after minting
      setFile(null);
      setTitle("");
      setDescription("");
      setCategory("");
      setPrice("");

      // Redirect to /gallery after successful minting
      setTimeout(() => navigate("/gallery"));

    } catch (error) {
      console.error("❌ Error Minting NFT:", error);
      toast.error(error.message || "NFT Minting Failed", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 450, mx: "auto", mt: 4, p: 3, boxShadow: 3, borderRadius: 3 }}>
      {/* <Toaster position="bottom-center" reverseOrder={false} /> */}
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
