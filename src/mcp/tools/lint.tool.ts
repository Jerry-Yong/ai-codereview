import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { MCPTool, LintIssue, ToolResult } from '../../types';

export const runEslintTool: MCPTool = {
  name: 'run_eslint',
  description: '对指定文件或项目运行 ESLint 检查，返回结构化问题列表',
  inputSchema: {
    type: 'object',
    properties: {
      files: {
        type: 'string',
        description: '要检查的文件列表（逗号分隔），为空则检查整个项目',
      },
      configPath: {
        type: 'string',
        description: 'ESLint 配置文件路径',
      },
    },
  },
  handler: async (input): Promise<ToolResult> => {
    try {
      const cwd = process.cwd();
      const files = input.files ? (input.files as string).split(',').map((f) => f.trim()) : ['.'];

      // 检查是否存在 eslint 配置
      const hasConfig = hasEslintConfig(cwd);

      let eslintBin = '';
      // 优先使用本地安装的 eslint
      const localEslint = path.join(cwd, 'node_modules', '.bin', 'eslint');
      if (fs.existsSync(localEslint)) {
        eslintBin = localEslint;
      } else {
        // 尝试使用全局 eslint
        try {
          execSync('which eslint', { encoding: 'utf-8' });
          eslintBin = 'eslint';
        } catch {
          return {
            success: true,
            data: {
              issues: [],
              summary: 'ESLint not found. Skipping lint analysis.',
              skipped: true,
            },
          };
        }
      }

      const configArg = input.configPath ? `--config ${input.configPath}` : '';
      const filesArg = files.join(' ');

      let output = '';
      try {
        output = execSync(
          `${eslintBin} ${filesArg} --format json ${configArg} --no-error-on-unmatched-pattern`,
          {
            encoding: 'utf-8',
            cwd,
            timeout: 60000,
          }
        );
      } catch (execError: unknown) {
        // ESLint 在有错误时会返回非零退出码
        if (execError && typeof execError === 'object' && 'stdout' in execError) {
          output = (execError as { stdout: string }).stdout || '';
        }
        if (!output) {
          return {
            success: true,
            data: {
              issues: [],
              summary: 'ESLint execution failed or no files to lint.',
              skipped: true,
            },
          };
        }
      }

      const issues: LintIssue[] = [];

      try {
        const results = JSON.parse(output);
        for (const fileResult of results) {
          const relativePath = path.relative(cwd, fileResult.filePath);
          for (const msg of fileResult.messages) {
            issues.push({
              file: relativePath,
              line: msg.line || 0,
              column: msg.column || 0,
              severity: msg.severity === 2 ? 'error' : 'warning',
              message: msg.message,
              ruleId: msg.ruleId || null,
            });
          }
        }
      } catch {
        // JSON 解析失败，返回原始输出信息
        return {
          success: true,
          data: {
            issues: [],
            summary: 'Failed to parse ESLint output',
            rawOutput: output.substring(0, 500),
          },
        };
      }

      return {
        success: true,
        data: {
          issues,
          totalErrors: issues.filter((i) => i.severity === 'error').length,
          totalWarnings: issues.filter((i) => i.severity === 'warning').length,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to run ESLint',
      };
    }
  },
};

function hasEslintConfig(cwd: string): boolean {
  const configFiles = [
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.json',
    '.eslintrc.yml',
    '.eslintrc.yaml',
    '.eslintrc',
    'eslint.config.js',
    'eslint.config.cjs',
    'eslint.config.mjs',
  ];

  for (const file of configFiles) {
    if (fs.existsSync(path.join(cwd, file))) return true;
  }

  // 检查 package.json 中的 eslintConfig
  const pkgPath = path.join(cwd, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.eslintConfig) return true;
    } catch {
      // ignore
    }
  }

  return false;
}
