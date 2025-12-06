import hre from "hardhat";

async function main() {
    const Escrow = await hre.ethers.getContractFactory("InfluencerEscrow");
    const escrow = await Escrow.deploy();

    await escrow.waitForDeployment();

    console.log("InfluencerEscrow deployed to:", await escrow.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
