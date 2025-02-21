const { ethers } = require("hardhat");

async function main() {
    const contractAddress = "0x8e86c6e09503Ea1B5071fBB8a5e41954e3c7dA04"; // Use your deployed contract address
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = await NFTMarketplace.attach(contractAddress);

    const [owner] = await ethers.getSigners();
    const tokenURI = "ipfs://bafkreiho6okevor6wojjorbtoqlovzgq6tgy5nafr3khf2dgwk3huh4e3m"; // Replace with actual IPFS URL

    console.log("Minting NFT...");
    const mintTx = await marketplace.mintNFT(owner.address, tokenURI);
    await mintTx.wait();

    console.log(`✅ NFT Minted Successfully! Token URI: ${tokenURI}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
