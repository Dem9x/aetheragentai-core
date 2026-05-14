import { Bot, Coins, FileText, Home, ShieldCheck, Terminal, User, Zap, type LucideIcon } from "lucide-react";

export type ProductPhase = "MVP_TESTNET" | "PHASE_2" | "PHASE_3";

export type ProductRoute = {
  href: string;
  label: string;
  icon: LucideIcon;
  phase: ProductPhase;
  summary: string;
};

export const coreRoutes: ProductRoute[] = [
  { href: "/", label: "Home", icon: Home, phase: "MVP_TESTNET", summary: "Testnet positioning and live task network preview." },
  { href: "/terminal", label: "Terminal", icon: Terminal, phase: "MVP_TESTNET", summary: "Command center for task, validation, reward, and network state." },
  { href: "/agents", label: "Agents", icon: Bot, phase: "MVP_TESTNET", summary: "Register and manage user-owned agent identities." },
  { href: "/tasks", label: "Tasks", icon: Zap, phase: "MVP_TESTNET", summary: "Create, inspect, fund, and submit task work." },
  { href: "/validation", label: "Validate", icon: ShieldCheck, phase: "MVP_TESTNET", summary: "Manual and multi-validator scoring console." },
  { href: "/rewards", label: "Rewards", icon: Coins, phase: "MVP_TESTNET", summary: "Claim protocol-based rewards after validation finalization." },
  { href: "/account", label: "Account", icon: User, phase: "MVP_TESTNET", summary: "Wallet session, runner credentials, and integration status." },
  { href: "/admin", label: "Admin", icon: ShieldCheck, phase: "MVP_TESTNET", summary: "Operator controls for indexer, metadata, and validator operations." },
  { href: "/docs", label: "Docs", icon: FileText, phase: "MVP_TESTNET", summary: "Beginner guide, safety notes, and production roadmap." }
];

export const phaseTwoFeatures = {
  marketplace: {
    title: "Agent Marketplace",
    route: "/marketplace",
    phase: "Phase 2 - Agent Economy",
    summary: "Licensing trained agents, memory packs, datasets, workflows, and reasoning modules.",
    unlocksAfter: "Core task flow is stable on Base Sepolia and agent reputation is indexed."
  },
  arena: {
    title: "Agent Arena",
    route: "/arena",
    phase: "Phase 2 - Agent Economy",
    summary: "Competitive agent tournaments for coding, math, security, logic, and strategy tasks.",
    unlocksAfter: "Validation rubrics, dispute handling, and anti-abuse scoring are tested."
  },
  swarm: {
    title: "Swarm Mining",
    route: "/swarm",
    phase: "Phase 2 - Agent Economy",
    summary: "Multi-agent coordination, shared context, role assignment, and contribution-based splits.",
    unlocksAfter: "Single-agent submission and reward claims work reliably."
  },
  studio: {
    title: "Agent Studio",
    route: "/studio",
    phase: "Phase 2 - Builder Tools",
    summary: "No-code/low-code hosted builder for users who do not run a local agent runner.",
    unlocksAfter: "Bring-your-own-agent CLI and metadata registration are complete."
  },
  governance: {
    title: "Governance",
    route: "/governance",
    phase: "Phase 3 - Validator Network",
    summary: "Protocol proposals, treasury allocation, validator policy, and reward structure votes.",
    unlocksAfter: "Admin roles move toward multisig and validator quorum."
  },
  leaderboard: {
    title: "Leaderboard",
    route: "/leaderboard",
    phase: "Phase 3 - Reputation",
    summary: "Rankings based on completed tasks, average score, dispute rate, and validator trust.",
    unlocksAfter: "Reputation is separated from token rewards and indexed from finalized tasks."
  }
} as const;

export const activeMvpFlow = [
  "Wallet connect on Base Sepolia",
  "Register user-owned agent",
  "Create or fund task",
  "Submit output URI/hash",
  "Validator scores submission",
  "Reward becomes claimable"
];
