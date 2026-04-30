import { LLMAnalysisInput } from '../types';

export function buildPrompt(input: LLMAnalysisInput): string {
  const { code, lintResults, astInfo, analysisGoals, projectStructure, fileList } = input;

  let prompt = `你是一位资深的高级代码审查工程师，拥有 10 年以上的软件工程经验。请对以下项目代码进行全面、深入、专业的代码审查。

你需要结合自身的专业知识和工程经验，从多个维度进行分析，不仅仅依赖工具输出，更要发挥你作为 AI 的深度理解和推理能力。

## 审查维度
${analysisGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

`;

  // 项目结构信息
  if (projectStructure) {
    prompt += `## 项目结构概览
${projectStructure}

`;
  }

  // 文件列表
  if (fileList && fileList.length > 0) {
    prompt += `## 本次审查文件列表（共 ${fileList.length} 个文件）
${fileList.map((f) => `- ${f}`).join('\n')}

`;
  }

  // 代码内容
  prompt += `## 代码内容
以下是需要审查的代码文件内容：

${code}

`;

  // ESLint 结果
  if (lintResults.length > 0) {
    prompt += `## 静态分析结果（ESLint）
共发现 ${lintResults.length} 个问题：
${lintResults
  .slice(0, 30)
  .map((r) => `- [${r.severity}] ${r.file}:${r.line}:${r.column} - ${r.message} (${r.ruleId || 'unknown'})`)
  .join('\n')}
${lintResults.length > 30 ? `\n... 还有 ${lintResults.length - 30} 个问题未列出` : ''}

`;
  } else {
    prompt += `## 静态分析结果（ESLint）
ESLint 未发现问题（或项目未配置 ESLint）。请你结合代码内容自行判断代码规范问题。

`;
  }

  // AST 分析
  if (astInfo.length > 0) {
    prompt += `## AST 结构分析
${astInfo
  .map((a) => {
    const imports = a.imports.length > 0
      ? `  依赖模块: ${a.imports.map((i) => i.source).join(', ')}`
      : '  无外部依赖';
    const funcs = a.functions.length > 0
      ? `  函数定义: ${a.functions.map((f) => `${f.name}(${f.params.join(', ')})`).join(', ')}`
      : '  无函数定义';
    const deps = a.functions
      .filter((f) => f.dependencies.length > 0)
      .map((f) => `    ${f.name} -> ${f.dependencies.join(', ')}`)
      .join('\n');
    return `文件: ${a.file}\n${imports}\n${funcs}${deps ? '\n  函数依赖关系:\n' + deps : ''}`;
  })
  .join('\n\n')}

`;
  }

  // 核心审查指令
  prompt += `## 审查要求

请你以资深工程师的视角，对代码进行**全面深入**的审查。要求如下：

### 1. 代码质量与规范（codeStyle）
- 变量/函数命名是否语义化、是否遵循一致的命名规范
- 代码是否存在重复（DRY 原则）
- 函数是否过长或职责不单一（SRP 原则）
- 是否存在魔法数字、硬编码
- 注释是否充分且有意义
- 代码格式和风格是否一致

### 2. 架构设计（architecture）
- 模块划分是否合理，是否遵循关注点分离
- 组件/模块间耦合度是否过高
- 依赖方向是否正确（是否存在循环依赖）
- 是否使用了合适的设计模式
- 代码分层是否清晰（如 MVC、MVVM 等）
- API 接口设计是否合理

### 3. 性能（performance）
- 是否存在内存泄漏风险（如未清理的定时器、事件监听器）
- 是否存在不必要的重复计算或渲染
- 大数据量场景是否有合理处理（分页、虚拟滚动等）
- 异步操作是否正确处理（Promise、async/await 使用是否得当）
- 是否存在 N+1 查询或批量操作缺失
- 资源加载是否有优化（懒加载、缓存等）

### 4. 安全规范（security）
- 是否存在 XSS、CSRF、SQL 注入等常见安全风险
- 敏感信息（API Key、密码、Token）是否暴露在代码中
- 用户输入是否经过校验和消毒
- 权限控制是否到位
- 是否使用了不安全的函数（eval、innerHTML 等）
- 第三方依赖是否存在已知漏洞风险

### 5. 可维护性（maintainability）
- 代码可读性如何，新人是否容易理解
- 是否存在技术债务
- 错误处理是否完善（try-catch、边界情况）
- TypeScript 类型定义是否完善
- 是否有合理的日志和调试信息
- 代码的扩展性如何

**重要提示**：
- 每个维度至少要给出 2-3 个具体的审查意见
- 问题要定位到具体文件和行号
- 建议要具体可操作，不要泛泛而谈
- 同时要指出代码中做得好的地方（作为 info 类型）
- 严重度请根据实际影响合理判定：critical（会导致线上故障/安全事故）、high（会导致明显 bug 或严重性能问题）、medium（一般质量问题）、low（建议改进项）、info（做得好的地方或一般性建议）

## 输出格式

请严格按照以下 JSON 格式输出，不要添加任何 markdown 代码块包裹：

{
  "issues": [
    {
      "file": "文件路径",
      "line": 行号,
      "type": "codeStyle|architecture|performance|security|maintainability",
      "severity": "critical|high|medium|low|info",
      "message": "具体问题描述（中文，详细说明问题是什么以及为什么是问题）",
      "suggestion": "具体改进建议（中文，给出可操作的改进方案或代码示例）"
    }
  ],
  "summary": "整体审查总结（中文，200-500字，包含项目整体评价、主要优点、核心问题、改进优先级建议）",
  "dimensionScores": {
    "architecture": 0-100,
    "performance": 0-100,
    "security": 0-100,
    "maintainability": 0-100
  }
}

注意：
- issues 数组应包含至少 8-15 个具有价值的审查意见，覆盖所有 5 个维度
- dimensionScores 中的分数必须是 0-100 的整数，请根据代码实际质量给出客观评分
- summary 要有深度，概括性地评价项目质量并给出优先改进建议
- 仅输出纯 JSON，不要使用 markdown 代码块包裹`;

  return prompt;
}
