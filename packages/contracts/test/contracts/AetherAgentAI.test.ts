import { expect } from "chai";
import { ethers } from "hardhat";

describe("AetherAgentAI protocol contracts", function () {
  async function deployFixture() {
    const [admin, treasury, user, validator, recipient, validatorTwo, validatorThree] = await ethers.getSigners();
    const initialSupply = ethers.parseUnits("1000000", 18);

    const token = await ethers.deployContract("AAAToken", [initialSupply, treasury.address, admin.address]);
    const agentRegistry = await ethers.deployContract("AgentRegistry", [admin.address]);
    const taskBoard = await ethers.deployContract("TaskBoard", [await token.getAddress(), admin.address]);
    const validationRegistry = await ethers.deployContract("ValidationRegistry", [admin.address]);
    const rewardDistributor = await ethers.deployContract("RewardDistributor", [await token.getAddress(), admin.address]);
    const staking = await ethers.deployContract("Staking", [await token.getAddress(), admin.address, 7 * 24 * 60 * 60]);

    return { admin, treasury, user, validator, recipient, validatorTwo, validatorThree, token, agentRegistry, taskBoard, validationRegistry, rewardDistributor, staking };
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

  it("requires validation quorum before finalization", async function () {
    const { admin, validator, validatorTwo, validatorThree, validationRegistry } = await deployFixture();
    const role = await validationRegistry.VALIDATOR_ROLE();
    await validationRegistry.grantRole(role, validator.address);
    await validationRegistry.grantRole(role, validatorTwo.address);
    await validationRegistry.grantRole(role, validatorThree.address);

    await validationRegistry.connect(validator).submitValidation(1, 1, 9100, 9400, "ipfs://result-1");
    await expect(validationRegistry.finalizeValidation(1)).to.be.revertedWithCustomError(validationRegistry, "QuorumNotMet");

    await validationRegistry.connect(validatorTwo).submitValidation(1, 1, 9000, 9300, "ipfs://result-2");
    await validationRegistry.connect(validatorThree).submitValidation(1, 1, 9200, 9500, "ipfs://result-3");
    await expect(validationRegistry.finalizeValidation(1)).to.emit(validationRegistry, "ValidationFinalized");

    await expect(validationRegistry.connect(admin).setMinimumQuorum(0)).to.be.revertedWithCustomError(validationRegistry, "InvalidQuorum");
  });

  it("defaults minimumQuorum to 3 and computes averages at quorum", async function () {
    const { validator, validatorTwo, validatorThree, validationRegistry } = await deployFixture();
    const role = await validationRegistry.VALIDATOR_ROLE();
    await validationRegistry.grantRole(role, validator.address);
    await validationRegistry.grantRole(role, validatorTwo.address);
    await validationRegistry.grantRole(role, validatorThree.address);

    expect(await validationRegistry.minimumQuorum()).to.equal(3);
    await validationRegistry.connect(validator).submitValidation(9, 77, 9000, 9300, "ipfs://1");
    await validationRegistry.connect(validatorTwo).submitValidation(9, 77, 8000, 8700, "ipfs://2");
    await validationRegistry.connect(validatorThree).submitValidation(9, 77, 7000, 8400, "ipfs://3");

    await expect(validationRegistry.finalizeValidation(77))
      .to.emit(validationRegistry, "ValidationFinalized")
      .withArgs(9, 77, 8000, 8800, 3);
    const result = await validationRegistry.finalizedResults(77);
    expect(result.averageScore).to.equal(8000);
    expect(result.averageConfidence).to.equal(8800);
    expect(result.validatorCount).to.equal(3);
  });

  it("allows admin to update quorum and rejects invalid/non-admin updates", async function () {
    const { user, validationRegistry } = await deployFixture();
    await expect(validationRegistry.setMinimumQuorum(2))
      .to.emit(validationRegistry, "MinimumQuorumUpdated")
      .withArgs(3, 2);
    expect(await validationRegistry.minimumQuorum()).to.equal(2);
    await expect(validationRegistry.setMinimumQuorum(0)).to.be.revertedWithCustomError(validationRegistry, "InvalidQuorum");
    await expect(validationRegistry.setMinimumQuorum(26)).to.be.revertedWithCustomError(validationRegistry, "InvalidQuorum");
    await expect(validationRegistry.connect(user).setMinimumQuorum(4)).to.be.reverted;
  });

  it("rejects duplicate validators and double finalization", async function () {
    const { validator, validatorTwo, validationRegistry } = await deployFixture();
    const role = await validationRegistry.VALIDATOR_ROLE();
    await validationRegistry.setMinimumQuorum(2);
    await validationRegistry.grantRole(role, validator.address);
    await validationRegistry.grantRole(role, validatorTwo.address);
    await validationRegistry.connect(validator).submitValidation(1, 88, 9000, 9000, "ipfs://1");
    await expect(validationRegistry.connect(validator).submitValidation(1, 88, 9100, 9100, "ipfs://dup")).to.be.revertedWithCustomError(validationRegistry, "DuplicateValidation");
    await validationRegistry.connect(validatorTwo).submitValidation(1, 88, 9200, 9200, "ipfs://2");
    await validationRegistry.finalizeValidation(88);
    await expect(validationRegistry.finalizeValidation(88)).to.be.revertedWithCustomError(validationRegistry, "AlreadyFinalized");
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

  it("enforces reward finalizer role, duplicate allocation, no-reward claim, and pause", async function () {
    const { token, treasury, user, recipient, rewardDistributor } = await deployFixture();
    const amount = ethers.parseUnits("250", 18);
    await token.connect(treasury).transfer(user.address, amount);
    await token.connect(user).approve(await rewardDistributor.getAddress(), amount);
    await rewardDistributor.connect(user).fundRewardPool(amount);

    await expect(rewardDistributor.connect(user).allocateReward(1, 11, recipient.address, amount)).to.be.reverted;
    await expect(rewardDistributor.connect(recipient).claim()).to.be.revertedWithCustomError(rewardDistributor, "NoReward");
    await rewardDistributor.allocateReward(1, 11, recipient.address, amount);
    await expect(rewardDistributor.allocateReward(1, 11, recipient.address, amount)).to.be.revertedWithCustomError(rewardDistributor, "AlreadyAllocated");

    await rewardDistributor.pause();
    await expect(rewardDistributor.allocateReward(1, 12, recipient.address, 1)).to.be.revertedWithCustomError(rewardDistributor, "EnforcedPause");
    await expect(rewardDistributor.connect(recipient).claim()).to.be.revertedWithCustomError(rewardDistributor, "EnforcedPause");
    await rewardDistributor.unpause();
    await expect(rewardDistributor.connect(recipient).claim()).to.emit(rewardDistributor, "RewardClaimed").withArgs(recipient.address, amount);
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
