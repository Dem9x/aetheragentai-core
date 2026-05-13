export type AgentType =
  | "Coding Agent"
  | "Research Agent"
  | "Blockchain Analysis Agent"
  | "Trading Agent"
  | "Mathematical Reasoning Agent"
  | "Security Agent"
  | "Optimization Agent"
  | "Multi-Modal Agent"
  | "Autonomous Web3 Agent";

export type TaskCategory = "Technical Tasks" | "AI Reasoning Tasks" | "Web3 Tasks" | "Real-World Tasks";
export type TaskCreatorType = "PROTOCOL" | "USER" | "DAO" | "SYSTEM";
export type TaskFundingStatus = "UNFUNDED" | "PARTIALLY_FUNDED" | "FUNDED" | "ESCROWED" | "ALLOCATED";
export type TaskValidationStatus = "NOT_STARTED" | "SUBMISSIONS_OPEN" | "IN_VALIDATION" | "FINALIZED" | "DISPUTED";
export type TaskSettlementStatus = "NOT_READY" | "PENDING_ALLOCATION" | "ALLOCATED" | "CLAIMABLE" | "CLAIMED";

export type Agent = {
  id: string;
  name: string;
  type: AgentType;
  status: "Mining" | "Idle" | "Paused" | "Arena" | "Validating";
  model: string;
  promptProfile: string;
  xp: number;
  reputation: number;
  totalRewards: number;
  solvedTasks: number;
  winRate: number;
  validationScore: number;
  poiScore: number;
  evolutionLevel: number;
  skills: Record<string, number>;
  unlockableModules: string[];
  recentOutputs: string[];
  history: { task: string; score: number; reward: number; date: string }[];
  trend: number[];
  integration?: AgentIntegration | null;
};

export type AgentRuntimeType = "HOSTED" | "LOCAL_RUNNER" | "AETHER_MANAGED";

export type AgentIntegration = {
  runtimeType: AgentRuntimeType;
  agentEndpoint?: string;
  publicKey?: string;
  webhookSecretHash?: string;
  capabilities: string[];
  status: "UNCONFIGURED" | "PENDING" | "ACTIVE" | "FAILED";
  lastCheckedAt?: string;
};

export type Task = {
  id: string;
  onchainTaskId?: string;
  title: string;
  category: TaskCategory;
  creatorType: TaskCreatorType;
  creatorName: string;
  creatorAddress?: string;
  creatorLabel?: string;
  metadataURI: string;
  rewardToken: "AAA";
  rewardFundingStatus: TaskFundingStatus;
  fundingTxHash?: string;
  escrowContract?: string;
  createdAt: string;
  brief: string;
  expectedOutput: string;
  complexityScore: number;
  rewardAAA: number;
  deadline: string;
  validationMethod: string;
  validationStatus: TaskValidationStatus;
  requiredValidatorQuorum: number;
  validatorCount: number;
  passingScore: number;
  settlementStatus: TaskSettlementStatus;
  solvedAt?: string;
  finalizedBy?: string;
  requiredSkills: string[];
  competitors: number;
  status: "Open" | "Mining" | "Validating" | "Solved";
  confidenceTarget: number;
  submittedAgents: string[];
};

export type PoIScore = {
  totalScore: number;
  grade: "S" | "A" | "B" | "C" | "D";
  components: Record<string, number>;
  explanation: string;
};

export type Reward = {
  id: string;
  source: string;
  amount: number;
  status: "Claimable" | "Pending" | "Claimed";
  timestamp: string;
};

export type TaskSubmission = {
  id: string;
  taskId: string;
  agentId: string;
  walletAddress?: string;
  solution: string;
  poi: PoIScore;
  reward: {
    amount: number;
    breakdown: Record<string, number>;
  };
  status: "Submitted" | "Validated" | "Rejected";
  createdAt: string;
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  type: string;
  poiScore: number;
  reputation: number;
  aaaEarned: number;
  solvedTasks: number;
  validationConfidence: number;
  trend: "up" | "down" | "flat";
};

export type Swarm = {
  id: string;
  name: string;
  composition: string[];
  roles: string[];
  taskDistribution: Record<string, number>;
  collaborationScore: number;
  rewardPool: number;
  logs: string[];
};

export type MarketplaceAsset = {
  id: string;
  name: string;
  type: "Trained Agent" | "Reasoning System" | "Automation Module" | "Memory Pack" | "Dataset" | "Workflow";
  creator: string;
  priceAAA: number;
  rating: number;
  performanceScore: number;
  licenseType: "Commercial" | "Research" | "Protocol" | "Limited";
};

export type ArenaMatch = {
  id: string;
  arena: string;
  participants: string[];
  status: "Live" | "Upcoming" | "Completed";
  prizePool: number;
  winner?: string;
};

export type GovernanceProposal = {
  id: string;
  title: string;
  category: "Protocol" | "Treasury" | "Rewards" | "Task Priority";
  status: "Active" | "Passed" | "Queued";
  votesFor: number;
  votesAgainst: number;
  summary: string;
};

export type NetworkStats = {
  aaaPrice: number;
  activeAgents: number;
  tasksSolved: number;
  intelligenceScore: number;
  rewardsDistributed: number;
  validationConfidence: number;
  swarmCount: number;
};

export type ActivityLog = {
  id: string;
  type: "TASK_SOLVED" | "AGENT_DEPLOYED" | "REWARD" | "VALIDATION" | "SWARM" | "ARENA";
  message: string;
  timestamp: string;
  severity: "info" | "success" | "warning" | "danger";
};

export type AppData = {
  agents: Agent[];
  tasks: Task[];
  rewards: Reward[];
  leaderboard: LeaderboardEntry[];
  marketplaceAssets: MarketplaceAsset[];
  arenaMatches: ArenaMatch[];
  swarms: Swarm[];
  governanceProposals: GovernanceProposal[];
  networkStats: NetworkStats;
  activityLogs: ActivityLog[];
  submissions: TaskSubmission[];
  agentIntegrations?: Record<string, AgentIntegration>;
};
