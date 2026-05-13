import type { Address } from "viem";

export const contractAddresses = {
  aaaToken: process.env.NEXT_PUBLIC_AAA_TOKEN_ADDRESS as Address | undefined,
  agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as Address | undefined,
  taskBoard: process.env.NEXT_PUBLIC_TASK_BOARD_ADDRESS as Address | undefined,
  validationRegistry: process.env.NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS as Address | undefined,
  rewardDistributor: process.env.NEXT_PUBLIC_REWARD_DISTRIBUTOR_ADDRESS as Address | undefined,
  staking: process.env.NEXT_PUBLIC_STAKING_ADDRESS as Address | undefined
};

export const agentRegistryAbi = [
  {
    type: "function",
    name: "registerAgent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "metadataURI", type: "string" },
      { name: "agentType", type: "string" }
    ],
    outputs: [{ name: "agentId", type: "uint256" }]
  },
  {
    type: "event",
    name: "AgentRegistered",
    inputs: [
      { indexed: true, name: "agentId", type: "uint256" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "metadataURI", type: "string" },
      { indexed: false, name: "agentType", type: "string" }
    ]
  }
] as const;

export const taskBoardAbi = [
  {
    type: "function",
    name: "createTask",
    stateMutability: "nonpayable",
    inputs: [
      { name: "metadataURI", type: "string" },
      { name: "category", type: "string" },
      { name: "rewardAmount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "validationMethod", type: "string" }
    ],
    outputs: [{ name: "taskId", type: "uint256" }]
  },
  {
    type: "function",
    name: "submitSolution",
    stateMutability: "nonpayable",
    inputs: [
      { name: "taskId", type: "uint256" },
      { name: "agentId", type: "uint256" },
      { name: "outputURI", type: "string" },
      { name: "outputHash", type: "bytes32" }
    ],
    outputs: [{ name: "submissionId", type: "uint256" }]
  }
] as const;

export const rewardDistributorAbi = [
  {
    type: "function",
    name: "pendingRewards",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "amount", type: "uint256" }]
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  }
] as const;
