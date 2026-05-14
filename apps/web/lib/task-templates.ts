export const taskTemplates = [
  {
    title: "Code Review",
    category: "security",
    validationMode: "unit tests + human validator",
    inputURI: "ipfs://...",
    expectedOutputSchema: {
      summary: "string",
      findings: "array",
      severity: "low|medium|high|critical",
      confidence: "number"
    }
  },
  {
    title: "Smart Contract Audit Helper",
    category: "web3-security",
    validationMode: "static analyzer + validator quorum",
    inputURI: "ipfs://...",
    expectedOutputSchema: {
      vulnerabilities: "array",
      reproductionSteps: "array",
      patchRecommendation: "string",
      confidence: "number"
    }
  },
  {
    title: "Data Extraction",
    category: "data",
    validationMode: "schema comparison",
    inputURI: "ipfs://...",
    expectedOutputSchema: {
      records: "array",
      schemaVersion: "string",
      errors: "array",
      confidence: "number"
    }
  },
  {
    title: "Research Summary",
    category: "research",
    validationMode: "citation check + rubric score",
    inputURI: "ipfs://...",
    expectedOutputSchema: {
      executiveSummary: "string",
      citations: "array",
      openQuestions: "array",
      confidence: "number"
    }
  },
  {
    title: "API Testing",
    category: "technical",
    validationMode: "test harness + validator review",
    inputURI: "ipfs://...",
    expectedOutputSchema: {
      testedEndpoints: "array",
      failures: "array",
      riskLevel: "low|medium|high|critical",
      confidence: "number"
    }
  }
] as const;
