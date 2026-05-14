// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract ValidationRegistry is AccessControl, Pausable {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant FINALIZER_ROLE = keccak256("FINALIZER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct ValidationResult {
        uint256 taskId;
        uint256 submissionId;
        address validator;
        uint256 score;
        uint256 confidence;
        string resultURI;
        uint256 timestamp;
    }

    struct AggregateResult {
        uint256 taskId;
        uint256 submissionId;
        uint256 averageScore;
        uint256 averageConfidence;
        uint256 validatorCount;
        bool finalized;
    }

    mapping(uint256 => ValidationResult[]) private resultsBySubmission;
    mapping(uint256 => mapping(address => bool)) public hasValidated;
    mapping(uint256 => AggregateResult) public finalizedResults;
    uint256 public minimumQuorum = 3;

    event ValidationSubmitted(uint256 indexed taskId, uint256 indexed submissionId, address indexed validator, uint256 score, uint256 confidence, string resultURI);
    event ValidationFinalized(uint256 indexed taskId, uint256 indexed submissionId, uint256 averageScore, uint256 averageConfidence, uint256 validatorCount);
    event MinimumQuorumUpdated(uint256 minimumQuorum);

    error InvalidScore();
    error DuplicateValidation();
    error NoValidations();
    error QuorumNotMet();
    error InvalidQuorum();
    error AlreadyFinalized();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VALIDATOR_ROLE, admin);
        _grantRole(FINALIZER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    function submitValidation(uint256 taskId, uint256 submissionId, uint256 score, uint256 confidence, string calldata resultURI) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        if (score > 10000 || confidence > 10000) revert InvalidScore();
        if (hasValidated[submissionId][msg.sender]) revert DuplicateValidation();
        hasValidated[submissionId][msg.sender] = true;
        resultsBySubmission[submissionId].push(ValidationResult({
            taskId: taskId,
            submissionId: submissionId,
            validator: msg.sender,
            score: score,
            confidence: confidence,
            resultURI: resultURI,
            timestamp: block.timestamp
        }));
        emit ValidationSubmitted(taskId, submissionId, msg.sender, score, confidence, resultURI);
    }

    function finalizeValidation(uint256 submissionId) external onlyRole(FINALIZER_ROLE) whenNotPaused returns (AggregateResult memory aggregate) {
        if (finalizedResults[submissionId].finalized) revert AlreadyFinalized();
        ValidationResult[] storage results = resultsBySubmission[submissionId];
        if (results.length == 0) revert NoValidations();
        if (results.length < minimumQuorum) revert QuorumNotMet();

        uint256 scoreSum;
        uint256 confidenceSum;
        for (uint256 i = 0; i < results.length; i++) {
            scoreSum += results[i].score;
            confidenceSum += results[i].confidence;
        }

        aggregate = AggregateResult({
            taskId: results[0].taskId,
            submissionId: submissionId,
            averageScore: scoreSum / results.length,
            averageConfidence: confidenceSum / results.length,
            validatorCount: results.length,
            finalized: true
        });
        finalizedResults[submissionId] = aggregate;
        emit ValidationFinalized(aggregate.taskId, submissionId, aggregate.averageScore, aggregate.averageConfidence, aggregate.validatorCount);
    }

    function getValidationCount(uint256 submissionId) external view returns (uint256) {
        return resultsBySubmission[submissionId].length;
    }

    function setMinimumQuorum(uint256 newQuorum) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newQuorum == 0 || newQuorum > 25) revert InvalidQuorum();
        minimumQuorum = newQuorum;
        emit MinimumQuorumUpdated(newQuorum);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
