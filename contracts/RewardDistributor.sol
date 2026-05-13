// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract RewardDistributor is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant REWARD_FINALIZER_ROLE = keccak256("REWARD_FINALIZER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public immutable aaaToken;
    mapping(address => uint256) public pendingRewards;
    mapping(uint256 => bool) public rewardAllocatedForSubmission;

    event RewardPoolFunded(address indexed funder, uint256 amount);
    event RewardAllocated(uint256 indexed taskId, uint256 indexed submissionId, address indexed recipient, uint256 amount);
    event RewardClaimed(address indexed recipient, uint256 amount);

    error AlreadyAllocated();
    error NoReward();
    error ZeroAddress();
    error ZeroAmount();

    constructor(IERC20 token, address admin) {
        if (address(token) == address(0) || admin == address(0)) revert ZeroAddress();
        aaaToken = token;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REWARD_FINALIZER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function fundRewardPool(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        aaaToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardPoolFunded(msg.sender, amount);
    }

    function allocateReward(uint256 taskId, uint256 submissionId, address recipient, uint256 amount) external onlyRole(REWARD_FINALIZER_ROLE) whenNotPaused {
        if (rewardAllocatedForSubmission[submissionId]) revert AlreadyAllocated();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        rewardAllocatedForSubmission[submissionId] = true;
        pendingRewards[recipient] += amount;
        emit RewardAllocated(taskId, submissionId, recipient, amount);
    }

    function claim() external nonReentrant whenNotPaused {
        uint256 amount = pendingRewards[msg.sender];
        if (amount == 0) revert NoReward();
        pendingRewards[msg.sender] = 0;
        aaaToken.safeTransfer(msg.sender, amount);
        emit RewardClaimed(msg.sender, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
