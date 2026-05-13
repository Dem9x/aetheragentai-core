import { parseAbiItem } from "viem";

export const indexedEvents = [
  parseAbiItem("event AgentRegistered(uint256 indexed agentId, address indexed owner, string metadataURI, string agentType)"),
  parseAbiItem("event AgentUpdated(uint256 indexed agentId, string metadataURI)"),
  parseAbiItem("event AgentStatusChanged(uint256 indexed agentId, bool active)"),
  parseAbiItem("event AgentReputationUpdated(uint256 indexed agentId, uint256 reputation)"),
  parseAbiItem("event TaskCreated(uint256 indexed taskId, address indexed creator, string metadataURI, uint256 rewardAmount)"),
  parseAbiItem("event TaskFunded(uint256 indexed taskId, address indexed funder, uint256 amount)"),
  parseAbiItem("event SolutionSubmitted(uint256 indexed submissionId, uint256 indexed taskId, uint256 indexed agentId, address submitter, string outputURI, bytes32 outputHash)"),
  parseAbiItem("event TaskStatusChanged(uint256 indexed taskId, uint8 status)"),
  parseAbiItem("event ValidationSubmitted(uint256 indexed taskId, uint256 indexed submissionId, address indexed validator, uint256 score, uint256 confidence, string resultURI)"),
  parseAbiItem("event ValidationFinalized(uint256 indexed taskId, uint256 indexed submissionId, uint256 averageScore, uint256 averageConfidence, uint256 validatorCount)"),
  parseAbiItem("event RewardAllocated(uint256 indexed taskId, uint256 indexed submissionId, address indexed recipient, uint256 amount)"),
  parseAbiItem("event RewardClaimed(address indexed recipient, uint256 amount)"),
  parseAbiItem("event RewardPoolFunded(address indexed funder, uint256 amount)"),
  parseAbiItem("event Staked(address indexed user, uint256 amount, uint256 unlocksAt)"),
  parseAbiItem("event Unstaked(address indexed user, uint256 amount)"),
  parseAbiItem("event StakeUpdated(address indexed user, uint256 totalAmount, uint256 unlocksAt)")
] as const;
