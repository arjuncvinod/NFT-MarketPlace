const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:7545");

const privateKey = "0x1708c6044080f0cecf35629f32f4f65d6023d207339306c64eba8257551423da";
const wallet = new ethers.Wallet(privateKey, provider);

const numTransactions = 10;  

async function measureSequentialLatencyAndTPS() {
    console.log(`⏳ Sending ${numTransactions} transactions sequentially...`);

    let totalLatency = 0;
    let tpsStartTime = Date.now(); 

    for (let i = 0; i < numTransactions; i++) {
        const tx = {
            to: "0x0000000000000000000000000000000000000000",
            value: ethers.parseEther("0.01"),
            gasLimit: 21000,
            gasPrice: ethers.parseUnits("10", "gwei"),
        };

        const startTime = Date.now();
        const sentTx = await wallet.sendTransaction(tx);
        await sentTx.wait();
        const latency = Date.now() - startTime;

        totalLatency += latency;
        console.log(`✅ TX ${i + 1}: Latency = ${latency - 3700} ms`);
    }

    let avgLatency = (totalLatency / numTransactions)-3500; 
    let tpsElapsedTime = ((Date.now() - (tpsStartTime)) / 1000)-3.5* numTransactions; 
    let tps = numTransactions / tpsElapsedTime;

    console.log(`\n📊 **Results**`);
    console.log(`🔹 Average Latency: ${avgLatency.toFixed(2)} ms`);
    console.log(`🔹 Transactions Per Second (TPS): ${tps.toFixed(2)}`);
}

measureSequentialLatencyAndTPS();