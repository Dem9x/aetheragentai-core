export type AgentRuntimeInput = {
  agent: Record<string, unknown>;
  task: Record<string, unknown>;
};

export type AgentRuntimeOutput = {
  summary: string;
  outputURI?: string;
  outputHash?: string;
  logs: string[];
};

export interface AIProvider {
  runTask(input: AgentRuntimeInput): Promise<AgentRuntimeOutput>;
  validateOutput(input: AgentRuntimeInput & { submission: Record<string, unknown> }): Promise<AgentRuntimeOutput>;
  scoreOutput(input: AgentRuntimeInput & { submission: Record<string, unknown> }): Promise<Record<string, number>>;
}

export class OpenAIProvider implements AIProvider {
  async runTask(): Promise<AgentRuntimeOutput> {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
    throw new Error("OpenAI provider adapter is intentionally a placeholder until model policy and rate limits are configured.");
  }

  async validateOutput(): Promise<AgentRuntimeOutput> {
    throw new Error("OpenAI validation adapter is not configured.");
  }

  async scoreOutput(): Promise<Record<string, number>> {
    throw new Error("OpenAI scoring adapter is not configured.");
  }
}

export class OllamaProvider implements AIProvider {
  async runTask(): Promise<AgentRuntimeOutput> {
    throw new Error("Ollama provider adapter is not configured.");
  }

  async validateOutput(): Promise<AgentRuntimeOutput> {
    throw new Error("Ollama validation adapter is not configured.");
  }

  async scoreOutput(): Promise<Record<string, number>> {
    throw new Error("Ollama scoring adapter is not configured.");
  }
}

export class LocalModelProvider implements AIProvider {
  async runTask(): Promise<AgentRuntimeOutput> {
    throw new Error("Local model adapter is not configured.");
  }

  async validateOutput(): Promise<AgentRuntimeOutput> {
    throw new Error("Local validation adapter is not configured.");
  }

  async scoreOutput(): Promise<Record<string, number>> {
    throw new Error("Local scoring adapter is not configured.");
  }
}

export class TestProvider implements AIProvider {
  async runTask(): Promise<AgentRuntimeOutput> {
    return {
      summary: "Deterministic test provider output.",
      logs: ["provider=test", "secrets=redacted"]
    };
  }

  async validateOutput(): Promise<AgentRuntimeOutput> {
    return {
      summary: "Deterministic validation completed.",
      logs: ["validation=local"]
    };
  }

  async scoreOutput(): Promise<Record<string, number>> {
    return {
      reasoningQuality: 86,
      executionAccuracy: 88,
      taskComplexity: 80,
      solutionEfficiency: 84,
      collaborationEffectiveness: 76,
      innovationScore: 72,
      verificationConfidence: 90,
      agentReputation: 75
    };
  }
}

export function getAIProvider(): AIProvider {
  switch (process.env.AI_PROVIDER) {
    case "openai":
      return new OpenAIProvider();
    case "ollama":
      return new OllamaProvider();
    case "local":
      return new LocalModelProvider();
    default:
      return new TestProvider();
  }
}
