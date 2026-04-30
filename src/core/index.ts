import { MCPServer } from '../mcp/server';
import { MCPClient } from '../mcp/client';
import { allTools } from '../mcp/tools';
import { createLLMAdapter } from '../llm';
import { ScoreEngine } from '../scoring';
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

    for (const tool of allTools) {
      this.server.registerTool(tool);
    }
  }

  async run(): Promise<ReviewResult> {
    await this.server.start();

    try {
      // 1. 获取代码范围
      const files = await this.getCodeScope();

      // 2. 调用 MCP tools 获取上下文
      const codeContext = await this.gatherContext(files);

      // 3. 执行 ESLint
      const lintResult = await this.runLint(files);
      const lintIssues: LintIssue[] = lintResult.issues || [];

      // 4. 获取 AST 信息
      const astInfos = await this.gatherASTInfo(files);

      // 5. 获取项目结构信息
      const projectStructure = await this.getProjectStructure();

      // 6. 构建 AI 输入并调用 LLM（传入更丰富的上下文）
      const llmOutput = await this.callLLM(codeContext, lintIssues, astInfos, projectStructure, files);

      // 7. 进行评分计算（由本地逻辑计算）
      const scoreEngine = new ScoreEngine(this.config.scoring?.weights);
      const score = scoreEngine.calculate(lintIssues, llmOutput, this.options.strict);

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
      return this.getAllProjectFiles();
    }

    // diff 模式：获取变更文件
    try {
      const result = await this.client.callToolOrThrow('get_changed_files', {
        includeUntracked: 'true',
      }) as ChangedFile[];

      const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.py', '.css', '.scss', '.less', '.html'];
      const changedFiles = result
        .filter((f) => f.status !== 'deleted')
        .filter((f) => codeExtensions.some((ext) => f.path.endsWith(ext)))
        .map((f) => f.path);

      // 如果 diff 模式没有变更文件，自动回退到全量扫描
      if (changedFiles.length === 0) {
        return this.getAllProjectFiles();
      }

      return changedFiles;
    } catch {
      // git 不可用，回退到全量扫描
      return this.getAllProjectFiles();
    }
  }

  private async getAllProjectFiles(): Promise<string[]> {
    const result = await this.client.callToolOrThrow('list_files', {
      extensions: 'ts,tsx,js,jsx,vue,py',
    }) as { files: Array<{ path: string; size: number }> };

    // 过滤掉过大的文件和配置文件
    return result.files
      .filter((f) => f.size < 100000) // 排除大于100KB的文件
      .filter((f) => !f.path.includes('.config.'))
      .filter((f) => !f.path.includes('.eslintrc'))
      .filter((f) => !f.path.endsWith('.d.ts'))
      .map((f) => f.path);
  }

  private async getProjectStructure(): Promise<string> {
    try {
      const result = await this.client.callToolOrThrow('list_files', {
        extensions: 'ts,tsx,js,jsx,vue,py,json',
      }) as { files: Array<{ path: string; size: number }>; totalFiles: number };

      const dirs = new Set<string>();
      for (const f of result.files) {
        const parts = f.path.split('/');
        if (parts.length > 1) {
          dirs.add(parts[0]);
          if (parts.length > 2) {
            dirs.add(parts.slice(0, 2).join('/'));
          }
        }
      }

      return `项目文件总数: ${result.totalFiles}\n主要目录: ${Array.from(dirs).slice(0, 20).join(', ')}\n文件列表(前30): ${result.files.slice(0, 30).map((f) => f.path).join(', ')}`;
    } catch {
      return '';
    }
  }

  private async gatherContext(files: string[]): Promise<string> {
    const maxFiles = 30; // 增加扫描文件数
    const targetFiles = files.slice(0, maxFiles);

    const contents: string[] = [];

    for (const file of targetFiles) {
      try {
        const result = await this.client.callToolOrThrow('read_file', { path: file }) as {
          path: string;
          content: string;
          lines: number;
        };
        // 限制单个文件长度
        const content = result.content.length > 5000
          ? result.content.substring(0, 5000) + '\n// ... (file truncated)'
          : result.content;
        contents.push(`// ========== File: ${file} (${result.lines} lines) ==========\n${content}`);
      } catch {
        // 跳过读取失败的文件
      }
    }

    // 增大总长度限制
    const maxLength = 80000;
    let combined = contents.join('\n\n');
    if (combined.length > maxLength) {
      combined = combined.substring(0, maxLength) + '\n\n... (truncated due to size limit)';
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
    const maxFiles = 15;
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
    astInfos: ASTInfo[],
    projectStructure: string,
    files: string[]
  ): Promise<LLMAnalysisOutput> {
    const adapter = createLLMAdapter(this.config.llm);

    const analysisGoals = [
      '代码质量：变量命名、函数设计、代码重复、过度复杂度',
      '代码规范：编码风格一致性、最佳实践遵循、注释质量',
      '架构设计：模块划分、依赖管理、组件耦合度、设计模式使用',
      '安全规范：XSS/CSRF/SQL注入风险、敏感信息暴露、权限校验',
      '性能问题：内存泄漏、不必要的重渲染、大数据处理、异步处理',
      '可维护性：代码可读性、扩展性、测试覆盖建议、技术债务',
    ];

    return adapter.analyze({
      code: codeContext,
      lintResults: lintIssues,
      astInfo: astInfos,
      analysisGoals,
      projectStructure,
      fileList: files,
    });
  }
}
