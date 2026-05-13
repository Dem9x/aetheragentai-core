import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const treasury = process.env.AAA_TREASURY_ADDRESS ?? deployer.address;
  const initialSupply = ethers.parseUnits(process.env.AAA_INITIAL_SUPPLY ?? "1000000000", 18);
  const stakingLockPeriod = BigInt(process.env.AAA_STAKING_LOCK_SECONDS ?? "604800");

  const AAAToken = await ethers.getContractFactory("AAAToken");
  const token = await AAAToken.deploy(initialSupply, treasury, deployer.address);
  await token.waitForDeployment();

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(deployer.address);
  await agentRegistry.waitForDeployment();

  const TaskBoard = await ethers.getContractFactory("TaskBoard");
  const taskBoard = await TaskBoard.deploy(await token.getAddress(), deployer.address);
  await taskBoard.waitForDeployment();

  const ValidationRegistry = await ethers.getContractFactory("ValidationRegistry");
  const validationRegistry = await ValidationRegistry.deploy(deployer.address);
  await validationRegistry.waitForDeployment();

  const RewardDistributor = await ethers.getContractFactory("RewardDistributor");
  const rewardDistributor = await RewardDistributor.deploy(await token.getAddress(), deployer.address);
  await rewardDistributor.waitForDeployment();

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(await token.getAddress(), deployer.address, stakingLockPeriod);
  await staking.waitForDeployment();

  console.log(JSON.stringify({
    network: await ethers.provider.getNetwork().then((network) => network.name),
    deployer: deployer.address,
    treasury,
    contracts: {
      AAAToken: await token.getAddress(),
      AgentRegistry: await agentRegistry.getAddress(),
      TaskBoard: await taskBoard.getAddress(),
      ValidationRegistry: await validationRegistry.getAddress(),
      RewardDistributor: await rewardDistributor.getAddress(),
      Staking: await staking.getAddress()
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
