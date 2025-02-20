const { ethers } = require("hardhat");

async function main() {
    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = await NFTMarketplace.deploy();
    await marketplace.waitForDeployment();

    console.log("NFT Marketplace deployed to:", await marketplace.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
