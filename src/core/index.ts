import { MCPServer } from '../mcp/server';
import { MCPClient } from '../mcp/client';
import { allTools } from '../mcp/tools';
import { createLLMAdapter } from '../llm';
import { ScoreEngine, shouldFail } from '../scoring';
import {
  CLIOptions,
  AppConfig,
  ReviewIssue,
  LintIssue,
  ASTInfo,
  ScoreResult,
  LLMAnalysisOutput,
  ChangedFile,
} from '../types';

export interface ReviewResult {
  score: ScoreResult;
  issues: ReviewIssue[];
  summary: string;
  lintIssues: LintIssue[];
  filesAnalyzed: number;
}

export class CodeReviewEngine {
  private server: MCPServer;
  private client: MCPClient;
  private config: AppConfig;
  private options: CLIOptions;

  constructor(config: AppConfig, options: CLIOptions) {
    this.config = config;
    this.options = options;
    this.server = new MCPServer();
    this.client = new MCPClient(this.server);

    // 注册所有工具
    for (const tool of allTools) {
      this.server.registerTool(tool);
    }
  }

  async run(): Promise<ReviewResult> {
    // 1. 启动 MCP Server
    await this.server.start();

    try {
      // 2. 获取代码范围
      const files = await this.getCodeScope();

      // 3. 调用 MCP tools 获取上下文
      const codeContext = await this.gatherContext(files);

      // 4. 执行 ESLint
      const lintResult = await this.runLint(files);
      const lintIssues: LintIssue[] = lintResult.issues || [];

      // 5. 获取 AST 信息
      const astInfos = await this.gatherASTInfo(files);

      // 6. 构建 AI 输入并调用 LLM
      const llmOutput = await this.callLLM(codeContext, lintIssues, astInfos);

      // 7. 进行评分计算（由本地逻辑计算）
      const scoreEngine = new ScoreEngine(this.config.scoring?.weights);
      const score = scoreEngine.calculate(lintIssues, llmOutput, this.options.strict);

      // 8. 组装结果
      return {
        score,
        issues: llmOutput.issues,
        summary: llmOutput.summary,
        lintIssues,
        filesAnalyzed: files.length,
      };
    } finally {
      await this.server.stop();
    }
  }

  private async getCodeScope(): Promise<string[]> {
    if (this.options.full) {
      // 全量扫描
      const result = await this.client.callToolOrThrow('list_files', {
        extensions: 'ts,tsx,js,jsx,vue,py',
      }) as { files: Array<{ path: string }> };
      return result.files.map((f) => f.path);
    } else {
      // 基于 git diff
      try {
        const result = await this.client.callToolOrThrow('get_changed_files', {
          includeUntracked: 'true',
        }) as ChangedFile[];

        const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.py'];
        return result
          .filter((f) => f.status !== 'deleted')
          .filter((f) => codeExtensions.some((ext) => f.path.endsWith(ext)))
          .map((f) => f.path);
      } catch {
        // 如果 git 不可用，回退到全量扫描
        const result = await this.client.callToolOrThrow('list_files', {
          extensions: 'ts,tsx,js,jsx,vue,py',
        }) as { files: Array<{ path: string }> };
        return result.files.map((f) => f.path);
      }
    }
  }

  private async gatherContext(files: string[]): Promise<string> {
    const maxFiles = 20; // 限制文件数量
    const targetFiles = files.slice(0, maxFiles);

    const contents: string[] = [];

    for (const file of targetFiles) {
      try {
        const result = await this.client.callToolOrThrow('read_file', { path: file }) as {
          path: string;
          content: string;
        };
        contents.push(`// === File: ${file} ===\n${result.content}`);
      } catch {
        // 跳过读取失败的文件
      }
    }

    // 限制总长度
    const maxLength = 50000;
    let combined = contents.join('\n\n');
    if (combined.length > maxLength) {
      combined = combined.substring(0, maxLength) + '\n\n... (truncated)';
    }

    return combined;
  }

  private async runLint(files: string[]): Promise<{ issues: LintIssue[] }> {
    try {
      const filesArg = files.length > 0 ? files.join(',') : undefined;
      const result = await this.client.callToolOrThrow('run_eslint', {
        files: filesArg,
      }) as { issues: LintIssue[]; skipped?: boolean };

      return { issues: result.issues || [] };
    } catch {
      return { issues: [] };
    }
  }

  private async gatherASTInfo(files: string[]): Promise<ASTInfo[]> {
    const astInfos: ASTInfo[] = [];
    const maxFiles = 10;
    const targetFiles = files.slice(0, maxFiles);

    for (const file of targetFiles) {
      try {
        const result = await this.client.callToolOrThrow('get_function_dependencies', {
          file,
        }) as ASTInfo;
        astInfos.push(result);
      } catch {
        // 跳过解析失败的文件
      }
    }

    return astInfos;
  }

  private async callLLM(
    codeContext: string,
    lintIssues: LintIssue[],
    astInfos: ASTInfo[]
  ): Promise<LLMAnalysisOutput> {
    const adapter = createLLMAdapter(this.config.llm);

    const analysisGoals = [
      '架构设计合理性',
      '性能问题检测',
      '安全漏洞识别',
      '代码可维护性评估',
    ];

    return adapter.analyze({
      code: codeContext,
      lintResults: lintIssues,
      astInfo: astInfos,
      analysisGoals,
    });
  }
}
