import {
  ScoreDimensions,
  ScoreResult,
  Grade,
  ReviewIssue,
  LintIssue,
  LLMAnalysisOutput,
} from '../types';

const DEFAULT_WEIGHTS: ScoreDimensions = {
  codeStyle: 0.2,
  architecture: 0.2,
  performance: 0.2,
  security: 0.2,
  maintainability: 0.2,
};

export class ScoreEngine {
  private weights: ScoreDimensions;

  constructor(weights?: Partial<ScoreDimensions>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.normalizeWeights();
  }

  /**
   * 计算最终评分
   * 评分由本地逻辑计算，不依赖 LLM 直接输出
   */
  calculate(
    lintIssues: LintIssue[],
    llmOutput: LLMAnalysisOutput,
    strict: boolean = false
  ): ScoreResult {
    const dimensions = this.computeDimensions(lintIssues, llmOutput, strict);
    const totalScore = this.computeTotal(dimensions);
    const grade = this.computeGrade(totalScore);

    return { dimensions, totalScore, grade };
  }

  private computeDimensions(
    lintIssues: LintIssue[],
    llmOutput: LLMAnalysisOutput,
    strict: boolean
  ): ScoreDimensions {
    // 1. codeStyle: 基于 ESLint 结果
    const codeStyleScore = this.computeCodeStyleScore(lintIssues, strict);

    // 2. architecture: 来自 AI 分析
    const architectureScore = this.adjustScore(
      llmOutput.dimensionScores.architecture || 70,
      llmOutput.issues.filter((i) => i.type === 'architecture'),
      strict
    );

    // 3. performance: AI + issue 严重度
    const performanceScore = this.adjustScore(
      llmOutput.dimensionScores.performance || 70,
      llmOutput.issues.filter((i) => i.type === 'performance'),
      strict
    );

    // 4. security: 规则 + AI
    const securityScore = this.computeSecurityScore(lintIssues, llmOutput, strict);

    // 5. maintainability: AST + AI
    const maintainabilityScore = this.adjustScore(
      llmOutput.dimensionScores.maintainability || 70,
      llmOutput.issues.filter((i) => i.type === 'maintainability'),
      strict
    );

    return {
      codeStyle: Math.round(codeStyleScore),
      architecture: Math.round(architectureScore),
      performance: Math.round(performanceScore),
      security: Math.round(securityScore),
      maintainability: Math.round(maintainabilityScore),
    };
  }

  private computeCodeStyleScore(lintIssues: LintIssue[], strict: boolean): number {
    if (lintIssues.length === 0) return 95;

    const errors = lintIssues.filter((i) => i.severity === 'error').length;
    const warnings = lintIssues.filter((i) => i.severity === 'warning').length;

    // 每个 error 扣 5 分，每个 warning 扣 2 分
    let penalty = errors * 5 + warnings * 2;

    if (strict) {
      penalty = Math.round(penalty * 1.5);
    }

    return Math.max(0, Math.min(100, 100 - penalty));
  }

  private computeSecurityScore(
    lintIssues: LintIssue[],
    llmOutput: LLMAnalysisOutput,
    strict: boolean
  ): number {
    // 安全相关的 lint 规则
    const securityRules = [
      'no-eval',
      'no-implied-eval',
      'no-new-func',
      'security',
    ];

    const securityLintIssues = lintIssues.filter(
      (i) => i.ruleId && securityRules.some((r) => i.ruleId!.includes(r))
    );

    const baseScore = llmOutput.dimensionScores.security || 80;
    const securityIssues = llmOutput.issues.filter((i) => i.type === 'security');

    let penalty = securityLintIssues.length * 10;
    penalty += securityIssues.filter((i) => i.severity === 'critical').length * 20;
    penalty += securityIssues.filter((i) => i.severity === 'high').length * 10;
    penalty += securityIssues.filter((i) => i.severity === 'medium').length * 5;

    if (strict) {
      penalty = Math.round(penalty * 1.5);
    }

    return Math.max(0, Math.min(100, baseScore - penalty));
  }

  private adjustScore(
    baseScore: number,
    issues: ReviewIssue[],
    strict: boolean
  ): number {
    let penalty = 0;

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          penalty += 15;
          break;
        case 'high':
          penalty += 8;
          break;
        case 'medium':
          penalty += 4;
          break;
        case 'low':
          penalty += 2;
          break;
        case 'info':
          penalty += 0;
          break;
      }
    }

    if (strict) {
      penalty = Math.round(penalty * 1.5);
    }

    return Math.max(0, Math.min(100, baseScore - penalty));
  }

  private computeTotal(dimensions: ScoreDimensions): number {
    const total =
      dimensions.codeStyle * this.weights.codeStyle +
      dimensions.architecture * this.weights.architecture +
      dimensions.performance * this.weights.performance +
      dimensions.security * this.weights.security +
      dimensions.maintainability * this.weights.maintainability;

    return Math.round(total);
  }

  private computeGrade(score: number): Grade {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    if (score >= 50) return 'E';
    if (score >= 30) return 'F';
    return 'G';
  }

  private normalizeWeights(): void {
    const sum =
      this.weights.codeStyle +
      this.weights.architecture +
      this.weights.performance +
      this.weights.security +
      this.weights.maintainability;

    if (Math.abs(sum - 1) > 0.001) {
      this.weights.codeStyle /= sum;
      this.weights.architecture /= sum;
      this.weights.performance /= sum;
      this.weights.security /= sum;
      this.weights.maintainability /= sum;
    }
  }
}

export function gradeToNumber(grade: Grade): number {
  const gradeMap: Record<Grade, number> = {
    A: 7,
    B: 6,
    C: 5,
    D: 4,
    E: 3,
    F: 2,
    G: 1,
  };
  return gradeMap[grade];
}

export function shouldFail(currentGrade: Grade, failOnGrade: Grade): boolean {
  return gradeToNumber(currentGrade) < gradeToNumber(failOnGrade);
}
