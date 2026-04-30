// MCP Tool 相关类型
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, { type: string; description: string }>;
  required?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  handler: (input: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

export interface ToolCallRequest {
  toolName: string;
  input: Record<string, unknown>;
}

export interface ToolCallResponse {
  toolName: string;
  result: ToolResult;
}

// 代码审查相关类型
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IssueType = 'codeStyle' | 'architecture' | 'performance' | 'security' | 'maintainability';

export interface ReviewIssue {
  file: string;
  line: number;
  type: IssueType;
  severity: IssueSeverity;
  message: string;
  suggestion: string;
}

// 评分相关类型
export interface ScoreDimensions {
  codeStyle: number;
  architecture: number;
  performance: number;
  security: number;
  maintainability: number;
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface ScoreResult {
  dimensions: ScoreDimensions;
  totalScore: number;
  grade: Grade;
}

// LLM 相关类型
export type LLMProvider = 'openai' | 'claude';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
  baseURL?: string;
}

export interface LLMAnalysisInput {
  code: string;
  lintResults: LintIssue[];
  astInfo: ASTInfo[];
  analysisGoals: string[];
  projectStructure?: string;
  fileList?: string[];
}

export interface LLMAnalysisOutput {
  issues: ReviewIssue[];
  summary: string;
  dimensionScores: Partial<ScoreDimensions>;
}

// Lint 相关类型
export interface LintIssue {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  ruleId: string | null;
}

// AST 相关类型
export interface ASTInfo {
  file: string;
  imports: ImportInfo[];
  functions: FunctionInfo[];
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  line: number;
}

export interface FunctionInfo {
  name: string;
  line: number;
  params: string[];
  dependencies: string[];
}

// Git 相关类型
export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  content: string;
}

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
}

// CLI 相关类型
export interface CLIOptions {
  full: boolean;
  diff: boolean;
  strict: boolean;
  failOn?: Grade;
}

// 配置相关类型
export interface AppConfig {
  llm: LLMConfig;
  eslint: {
    configPath?: string;
  };
  scoring: {
    weights: ScoreDimensions;
  };
}
