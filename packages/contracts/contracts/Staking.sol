// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Staking is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct StakePosition {
        uint256 amount;
        uint256 updatedAt;
        uint256 unlocksAt;
    }

    IERC20 public immutable aaaToken;
    uint256 public immutable lockPeriod;
    mapping(address => StakePosition) public stakes;

    event Staked(address indexed user, uint256 amount, uint256 unlocksAt);
    event Unstaked(address indexed user, uint256 amount);
    event StakeUpdated(address indexed user, uint256 totalAmount, uint256 unlocksAt);

    error ZeroAmount();
    error StakeLocked(uint256 unlocksAt);
    error InsufficientStake();
    error ZeroAddress();

    constructor(IERC20 token, address admin, uint256 configuredLockPeriod) {
        if (address(token) == address(0) || admin == address(0)) revert ZeroAddress();
        aaaToken = token;
        lockPeriod = configuredLockPeriod;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function stake(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        StakePosition storage position = stakes[msg.sender];
        aaaToken.safeTransferFrom(msg.sender, address(this), amount);
        position.amount += amount;
        position.updatedAt = block.timestamp;
        position.unlocksAt = block.timestamp + lockPeriod;
        emit Staked(msg.sender, amount, position.unlocksAt);
        emit StakeUpdated(msg.sender, position.amount, position.unlocksAt);
    }

    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        StakePosition storage position = stakes[msg.sender];
        if (amount == 0) revert ZeroAmount();
        if (position.amount < amount) revert InsufficientStake();
        if (block.timestamp < position.unlocksAt) revert StakeLocked(position.unlocksAt);
        position.amount -= amount;
        position.updatedAt = block.timestamp;
        aaaToken.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
        emit StakeUpdated(msg.sender, position.amount, position.unlocksAt);
    }

    function reputationMultiplierBps(address user) external view returns (uint256) {
        uint256 amount = stakes[user].amount;
        if (amount >= 100_000 ether) return 12000;
        if (amount >= 10_000 ether) return 11000;
        if (amount >= 1_000 ether) return 10500;
        return 10000;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
