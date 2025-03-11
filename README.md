# 🚀 NFT Marketplace  

An advanced **NFT Marketplace** built with **React (Vite), Hardhat, IPFS (Pinata), ethers.js, and Firebase**. Users can mint, buy, and sell NFTs seamlessly, with an integrated **auction system** for bidding.  
#### [Live Demo](https://nftmarketplace-acv.netlify.app/)
## 🔥 Features  

✅ **MetaMask Authentication** – Secure Web3 login  
✅ **NFT Minting** – Upload NFTs with metadata stored on **IPFS (Pinata)**  
✅ **NFT Display** – Fetch and show minted NFTs  
✅ **Buying & Selling NFTs** – Transfer ownership with payments  
✅ **Auction System** – Bid-based NFT sales with auto-refund for losing bidders  

## 🛠️ Tech Stack  

- **Frontend:** React (Vite), ethers.js  
- **Backend:** Hardhat (Solidity Smart Contracts)  
- **Storage:** IPFS (Pinata)  
- **Blockchain Interaction:** MetaMask  

## 📌 Installation  

### 1️⃣ Clone the Repo  
```bash
git clone https://github.com/arjuncvinod/NFT-MarketPlace.git
cd NFT-MarketPlace
```

### 2️⃣ Install Dependencies  
```bash
npm install

cd frontend

npm install
```

### 3️⃣ Setup Environment Variables  
Create a `.env` file in the /frontend and add:  
```plaintext
VITE_PINATA_API_KEY = your_pinata_api_key
VITE_PINATA_SECRET_KEY = your_pinata_secret_key
```

### 4️⃣ Start Development Server  
```bash
cd frontend
npm run dev
```

### 5️⃣ Deploy Smart Contract (Hardhat)  
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

## 📜 License  

This project is **open-source** under the MIT License.  
