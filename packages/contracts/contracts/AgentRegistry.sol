// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract AgentRegistry is AccessControl, Pausable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant REPUTATION_ROLE = keccak256("REPUTATION_ROLE");

    struct Agent {
        uint256 id;
        address owner;
        string metadataURI;
        string agentType;
        uint256 reputation;
        uint256 createdAt;
        bool active;
    }

    uint256 public nextAgentId = 1;
    mapping(uint256 => Agent) private agents;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, string agentType);
    event AgentUpdated(uint256 indexed agentId, string metadataURI);
    event AgentStatusChanged(uint256 indexed agentId, bool active);
    event AgentReputationUpdated(uint256 indexed agentId, uint256 reputation);

    error NotAgentOwner();
    error AgentNotFound();
    error EmptyMetadataURI();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(REPUTATION_ROLE, admin);
    }

    function registerAgent(string calldata metadataURI, string calldata agentType) external whenNotPaused returns (uint256 agentId) {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();
        agentId = nextAgentId++;
        agents[agentId] = Agent({
            id: agentId,
            owner: msg.sender,
            metadataURI: metadataURI,
            agentType: agentType,
            reputation: 0,
            createdAt: block.timestamp,
            active: true
        });
        emit AgentRegistered(agentId, msg.sender, metadataURI, agentType);
    }

    function updateMetadata(uint256 agentId, string calldata metadataURI) external whenNotPaused {
        Agent storage agent = _agent(agentId);
        if (agent.owner != msg.sender) revert NotAgentOwner();
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();
        agent.metadataURI = metadataURI;
        emit AgentUpdated(agentId, metadataURI);
    }

    function setActive(uint256 agentId, bool active) external whenNotPaused {
        Agent storage agent = _agent(agentId);
        if (agent.owner != msg.sender) revert NotAgentOwner();
        agent.active = active;
        emit AgentStatusChanged(agentId, active);
    }

    function updateReputation(uint256 agentId, uint256 reputation) external onlyRole(REPUTATION_ROLE) {
        Agent storage agent = _agent(agentId);
        agent.reputation = reputation;
        emit AgentReputationUpdated(agentId, reputation);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        return _agent(agentId);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _agent(uint256 agentId) private view returns (Agent storage agent) {
        agent = agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound();
    }
}
