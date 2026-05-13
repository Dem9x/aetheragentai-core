import { expect } from "chai";
import { ethers } from "hardhat";

describe("AetherAgentAI protocol contracts", function () {
  async function deployFixture() {
    const [admin, treasury, user, validator, recipient] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("1000000", 18);

    const token = await ethers.deployContract("AAAToken", [initialSupply, treasury.address, admin.address]);
    const agentRegistry = await ethers.deployContract("AgentRegistry", [admin.address]);
    const taskBoard = await ethers.deployContract("TaskBoard", [await token.getAddress(), admin.address]);
    const validationRegistry = await ethers.deployContract("ValidationRegistry", [admin.address]);
    const rewardDistributor = await ethers.deployContract("RewardDistributor", [await token.getAddress(), admin.address]);
    const staking = await ethers.deployContract("Staking", [await token.getAddress(), admin.address, 7 * 24 * 60 * 60]);

    return { admin, treasury, user, validator, recipient, token, agentRegistry, taskBoard, validationRegistry, rewardDistributor, staking };
  }

  it("deploys token with fixed max supply to treasury", async function () {
    const { token, treasury } = await deployFixture();
    expect(await token.name()).to.equal("AetherAgentAI");
    expect(await token.symbol()).to.equal("AAA");
    expect(await token.balanceOf(treasury.address)).to.equal(await token.maxSupply());
  });

  it("registers an agent and emits AgentRegistered", async function () {
    const { agentRegistry, user } = await deployFixture();
    await expect(agentRegistry.connect(user).registerAgent("ipfs://agent", "SECURITY"))
      .to.emit(agentRegistry, "AgentRegistered")
      .withArgs(1, user.address, "ipfs://agent", "SECURITY");
    const agent = await agentRegistry.getAgent(1);
    expect(agent.owner).to.equal(user.address);
    expect(agent.active).to.equal(true);
  });

  it("creates, funds, and accepts a task submission", async function () {
    const { token, treasury, user, taskBoard } = await deployFixture();
    const amount = ethers.parseUnits("1000", 18);
    await token.connect(treasury).transfer(user.address, amount);
    await token.connect(user).approve(await taskBoard.getAddress(), amount);

    const deadline = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    await expect(taskBoard.connect(user).createTask("ipfs://task", "TECHNICAL", amount, deadline, "AI_JUDGE"))
      .to.emit(taskBoard, "TaskCreated");

    await expect(taskBoard.connect(user).submitSolution(1, 1, "ipfs://solution", ethers.id("solution")))
      .to.emit(taskBoard, "SolutionSubmitted");
  });

  it("prevents duplicate validation by same validator", async function () {
    const { validationRegistry } = await deployFixture();
    await validationRegistry.submitValidation(1, 1, 9100, 9400, "ipfs://result");
    await expect(validationRegistry.submitValidation(1, 1, 9000, 9300, "ipfs://result-2")).to.be.revertedWithCustomError(validationRegistry, "DuplicateValidation");
  });

  it("allocates and claims rewards through pull pattern", async function () {
    const { token, treasury, user, recipient, rewardDistributor } = await deployFixture();
    const amount = ethers.parseUnits("500", 18);
    await token.connect(treasury).transfer(user.address, amount);
    await token.connect(user).approve(await rewardDistributor.getAddress(), amount);
    await rewardDistributor.connect(user).fundRewardPool(amount);
    await expect(rewardDistributor.allocateReward(1, 1, recipient.address, amount)).to.emit(rewardDistributor, "RewardAllocated");
    await expect(rewardDistributor.connect(recipient).claim()).to.emit(rewardDistributor, "RewardClaimed");
    expect(await token.balanceOf(recipient.address)).to.equal(amount);
  });

  it("enforces staking lock period and supports fuzz-like amounts", async function () {
    const { token, treasury, user, staking } = await deployFixture();
    const amount = ethers.parseUnits("1234", 18);
    await token.connect(treasury).transfer(user.address, amount);
    await token.connect(user).approve(await staking.getAddress(), amount);
    await expect(staking.connect(user).stake(amount)).to.emit(staking, "Staked");
    await expect(staking.connect(user).unstake(1)).to.be.revertedWithCustomError(staking, "StakeLocked");
    await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine", []);
    await expect(staking.connect(user).unstake(amount)).to.emit(staking, "Unstaked");
  });

  it("honors paused state for critical actions", async function () {
    const { agentRegistry, admin, user } = await deployFixture();
    await agentRegistry.connect(admin).pause();
    await expect(agentRegistry.connect(user).registerAgent("ipfs://agent", "SECURITY")).to.be.revertedWithCustomError(agentRegistry, "EnforcedPause");
  });
});
