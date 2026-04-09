/** Types for inter-agent communication artifacts (written/read as files). */

export interface Feature {
  name: string;
  description: string;
  userStories: string[];
  acceptanceCriteria: string[];
}

export interface ProductSpec {
  projectName: string;
  overview: string;
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    other: string[];
  };
  designDirection: string;
  features: Feature[];
  aiFeatures: string[];
}

export interface QACriterion {
  name: string;
  description: string;
  score: number;       // 1-10
  maxScore: number;    // always 10
  passed: boolean;
  findings: string[];
}

export interface QAFeedback {
  round: number;
  overallPassed: boolean;
  criteria: QACriterion[];
  bugs: Array<{
    severity: "critical" | "major" | "minor";
    description: string;
    location?: string;
    stepsToReproduce?: string[];
  }>;
  summary: string;
  detailedFeedback: string;
}

export interface HarnessResult {
  prompt: string;
  spec: ProductSpec;
  qaRounds: QAFeedback[];
  totalRounds: number;
  finalPassed: boolean;
  outputDir: string;
}

/** File names for inter-agent communication */
export const ARTIFACT_FILES = {
  SPEC: "spec.md",
  QA_FEEDBACK: "qa-feedback.md",
  BUILD_STATUS: "build-status.md",
} as const;
