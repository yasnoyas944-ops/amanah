import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
    solidity: "0.8.24",
    networks: {
        bnbTestnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
        opbnbTestnet: {
            url: "https://opbnb-testnet-rpc.bnbchain.org",
            chainId: 5611,
            gasPrice: 20000000000,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        }
    }
};
