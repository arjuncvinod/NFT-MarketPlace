import axios from "axios";

const PINATA_API_KEY = import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = import.meta.env.VITE_PINATA_SECRET_KEY;

export const uploadFileToIPFS = async (file) => {
  if (!file) {
    console.error("❌ No file selected!");
    return null;
  }

  const formData = new FormData();
  formData.append("file", file, file.name);

  try {
    console.log("🔹 Uploading file to Pinata...");
    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
    });

    const imageCID = response.data.IpfsHash;
    return `ipfs://${imageCID}`;
  } catch (error) {
    console.error("❌ IPFS File Upload Error:", error.response?.data || error.message);
    return null;
  }
};

export const uploadJSONToIPFS = async (metadata) => {
  if (!metadata || !metadata.image) {
    console.error("❌ No image URI provided in metadata!");
    return null;
  }

  try {
    console.log("🔹 Uploading Metadata to Pinata...");
    const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", metadata, {
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
    });

    const metadataCID = response.data.IpfsHash;
    return `ipfs://${metadataCID}`;
  } catch (error) {
    console.error("❌ IPFS Metadata Upload Error:", error.response?.data || error.message);
    return null;
  }
};
