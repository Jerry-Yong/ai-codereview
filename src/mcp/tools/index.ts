import { MCPTool } from '../../types';
import { getDiffTool, getChangedFilesTool } from './git.tool';
import { readFileTool, listFilesTool } from './filesystem.tool';
import { runEslintTool } from './lint.tool';
import { getImportsTool, getFunctionDependenciesTool } from './ast.tool';

export const allTools: MCPTool[] = [
  // Git 工具
  getDiffTool,
  getChangedFilesTool,
  // 文件系统工具
  readFileTool,
  listFilesTool,
  // Lint 工具
  runEslintTool,
  // AST 工具
  getImportsTool,
  getFunctionDependenciesTool,
];

export {
  getDiffTool,
  getChangedFilesTool,
  readFileTool,
  listFilesTool,
  runEslintTool,
  getImportsTool,
  getFunctionDependenciesTool,
};
