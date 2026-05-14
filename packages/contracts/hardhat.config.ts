import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import { config as loadEnv } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import { resolve } from "node:path";

loadEnv({ path: resolve(__dirname, ".env") });
loadEnv();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;

function requiredNetworkUrl(name: string, value: string | undefined) {
  if (process.env.HARDHAT_NETWORK === name && !value) {
    throw new Error(
      `Missing ${name} RPC URL. Set BASE_SEPOLIA_RPC_URL in packages/contracts/.env or export it before running deploy.`
    );
  }
  return value ?? "http://127.0.0.1:8545";
}

function requiredAccounts(name: string, privateKey: string | undefined) {
  if (process.env.HARDHAT_NETWORK === name && !privateKey) {
    throw new Error(
      `Missing deployer private key. Set DEPLOYER_PRIVATE_KEY in packages/contracts/.env. Use a funded Base Sepolia test wallet only, never a mainnet treasury key.`
    );
  }
  return privateKey ? [privateKey] : [];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    baseSepolia: {
      url: requiredNetworkUrl("baseSepolia", BASE_SEPOLIA_RPC_URL),
      accounts: requiredAccounts("baseSepolia", PRIVATE_KEY),
      chainId: 84532
    }
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY ?? ""
    }
  }
};

export default config;
