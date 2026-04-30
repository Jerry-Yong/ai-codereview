import { LLMAnalysisInput } from '../types';

export function buildPrompt(input: LLMAnalysisInput): string {
  const { code, lintResults, astInfo, analysisGoals } = input;

  let prompt = `你是一个专业的代码审查工程师。请对以下代码进行深入分析。

## 分析目标
${analysisGoals.map((g) => `- ${g}`).join('\n')}

## 代码内容
\`\`\`
${code}
\`\`\`

`;

  if (lintResults.length > 0) {
    prompt += `## ESLint 检查结果
${lintResults
  .slice(0, 20)
  .map((r) => `- [${r.severity}] ${r.file}:${r.line} - ${r.message} (${r.ruleId})`)
  .join('\n')}

`;
  }

  if (astInfo.length > 0) {
    prompt += `## AST 分析信息
${astInfo
  .map(
    (a) =>
      `文件: ${a.file}\n  导入: ${a.imports.map((i) => i.source).join(', ')}\n  函数: ${a.functions.map((f) => f.name).join(', ')}`
  )
  .join('\n')}

`;
  }

  prompt += `## 输出要求
请以 JSON 格式返回分析结果，包含以下字段：

{
  "issues": [
    {
      "file": "文件路径",
      "line": 行号,
      "type": "codeStyle|architecture|performance|security|maintainability",
      "severity": "critical|high|medium|low|info",
      "message": "问题描述",
      "suggestion": "改进建议"
    }
  ],
  "summary": "整体总结（一段话）",
  "dimensionScores": {
    "architecture": 0-100,
    "performance": 0-100,
    "security": 0-100,
    "maintainability": 0-100
  }
}

注意：
- issues 数组中每个问题必须包含所有字段
- dimensionScores 中的分数必须是 0-100 的整数
- 仅返回 JSON，不要包含其他内容
- 请仅输出纯 JSON，不要使用 markdown 代码块包裹`;

  return prompt;
}
