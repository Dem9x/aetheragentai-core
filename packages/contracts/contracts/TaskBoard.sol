// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TaskBoard is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant TASK_ADMIN_ROLE = keccak256("TASK_ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    enum TaskStatus {
        Open,
        Closed,
        Finalized,
        Cancelled
    }

    struct Task {
        uint256 id;
        address creator;
        string metadataURI;
        string category;
        uint256 rewardAmount;
        uint256 deadline;
        TaskStatus status;
        string validationMethod;
    }

    struct Submission {
        uint256 id;
        uint256 taskId;
        uint256 agentId;
        address submitter;
        string outputURI;
        bytes32 outputHash;
        uint256 timestamp;
    }

    IERC20 public immutable aaaToken;
    uint256 public nextTaskId = 1;
    uint256 public nextSubmissionId = 1;
    mapping(uint256 => Task) private tasks;
    mapping(uint256 => Submission) private submissions;

    event TaskCreated(uint256 indexed taskId, address indexed creator, string metadataURI, uint256 rewardAmount);
    event TaskFunded(uint256 indexed taskId, address indexed funder, uint256 amount);
    event SolutionSubmitted(uint256 indexed submissionId, uint256 indexed taskId, uint256 indexed agentId, address submitter, string outputURI, bytes32 outputHash);
    event TaskStatusChanged(uint256 indexed taskId, TaskStatus status);

    error TaskNotFound();
    error TaskNotOpen();
    error DeadlineExpired();
    error EmptyMetadataURI();
    error InvalidDeadline();

    constructor(IERC20 token, address admin) {
        aaaToken = token;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TASK_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function createTask(string calldata metadataURI, string calldata category, uint256 rewardAmount, uint256 deadline, string calldata validationMethod) public whenNotPaused nonReentrant returns (uint256 taskId) {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();
        if (deadline <= block.timestamp) revert InvalidDeadline();
        taskId = nextTaskId++;
        tasks[taskId] = Task({
            id: taskId,
            creator: msg.sender,
            metadataURI: metadataURI,
            category: category,
            rewardAmount: 0,
            deadline: deadline,
            status: TaskStatus.Open,
            validationMethod: validationMethod
        });
        emit TaskCreated(taskId, msg.sender, metadataURI, rewardAmount);
        if (rewardAmount > 0) {
            _fundTask(taskId, msg.sender, rewardAmount);
        }
    }

    function adminCreateTask(string calldata metadataURI, string calldata category, uint256 rewardAmount, uint256 deadline, string calldata validationMethod) external onlyRole(TASK_ADMIN_ROLE) returns (uint256) {
        return createTask(metadataURI, category, rewardAmount, deadline, validationMethod);
    }

    function fundTask(uint256 taskId, uint256 amount) public whenNotPaused nonReentrant {
        _fundTask(taskId, msg.sender, amount);
    }

    function _fundTask(uint256 taskId, address funder, uint256 amount) internal {
        Task storage task = _task(taskId);
        if (task.status != TaskStatus.Open) revert TaskNotOpen();
        aaaToken.safeTransferFrom(funder, address(this), amount);
        task.rewardAmount += amount;
        emit TaskFunded(taskId, funder, amount);
    }

    function submitSolution(uint256 taskId, uint256 agentId, string calldata outputURI, bytes32 outputHash) external whenNotPaused returns (uint256 submissionId) {
        Task storage task = _task(taskId);
        if (task.status != TaskStatus.Open) revert TaskNotOpen();
        if (block.timestamp > task.deadline) revert DeadlineExpired();
        if (bytes(outputURI).length == 0) revert EmptyMetadataURI();

        submissionId = nextSubmissionId++;
        submissions[submissionId] = Submission({
            id: submissionId,
            taskId: taskId,
            agentId: agentId,
            submitter: msg.sender,
            outputURI: outputURI,
            outputHash: outputHash,
            timestamp: block.timestamp
        });
        emit SolutionSubmitted(submissionId, taskId, agentId, msg.sender, outputURI, outputHash);
    }

    function setTaskStatus(uint256 taskId, TaskStatus status) external onlyRole(TASK_ADMIN_ROLE) {
        Task storage task = _task(taskId);
        task.status = status;
        emit TaskStatusChanged(taskId, status);
    }

    function getTask(uint256 taskId) external view returns (Task memory) {
        return _task(taskId);
    }

    function getSubmission(uint256 submissionId) external view returns (Submission memory) {
        Submission storage submission = submissions[submissionId];
        if (submission.submitter == address(0)) revert TaskNotFound();
        return submission;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _task(uint256 taskId) private view returns (Task storage task) {
        task = tasks[taskId];
        if (task.creator == address(0)) revert TaskNotFound();
    }
}
