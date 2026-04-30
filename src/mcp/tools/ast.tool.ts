import * as fs from 'fs';
import * as path from 'path';
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { MCPTool, ASTInfo, ImportInfo, FunctionInfo, ToolResult } from '../../types';

export const getImportsTool: MCPTool = {
  name: 'get_imports',
  description: '解析文件的 import 依赖关系，返回结构化的导入信息',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description: '要分析的文件路径',
      },
    },
    required: ['file'],
  },
  handler: async (input): Promise<ToolResult> => {
    try {
      const filePath = path.resolve(process.cwd(), input.file as string);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          data: null,
          error: `File not found: ${filePath}`,
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const imports = parseImports(content, input.file as string);

      return {
        success: true,
        data: {
          file: input.file,
          imports,
          totalImports: imports.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to parse imports',
      };
    }
  },
};

export const getFunctionDependenciesTool: MCPTool = {
  name: 'get_function_dependencies',
  description: '分析文件中的函数及其依赖关系',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description: '要分析的文件路径',
      },
    },
    required: ['file'],
  },
  handler: async (input): Promise<ToolResult> => {
    try {
      const filePath = path.resolve(process.cwd(), input.file as string);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          data: null,
          error: `File not found: ${filePath}`,
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const astInfo = parseAST(content, input.file as string);

      return {
        success: true,
        data: astInfo,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to analyze functions',
      };
    }
  },
};

function parseImports(content: string, file: string): ImportInfo[] {
  const imports: ImportInfo[] = [];

  // 使用正则解析 import 语句（兼容 TypeScript）
  const importRegex = /import\s+(?:(?:\{([^}]*)\}|(\w+))\s+from\s+)?['"]([^'"]+)['"]/g;
  const lines = content.split('\n');

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const namedImports = match[1];
    const defaultImport = match[2];
    const source = match[3];

    const specifiers: string[] = [];
    if (namedImports) {
      specifiers.push(...namedImports.split(',').map((s) => s.trim()).filter(Boolean));
    }
    if (defaultImport) {
      specifiers.push(defaultImport);
    }

    // 计算行号
    const beforeMatch = content.substring(0, match.index);
    const line = beforeMatch.split('\n').length;

    imports.push({
      source,
      specifiers,
      line,
    });
  }

  return imports;
}

function parseAST(content: string, file: string): ASTInfo {
  const imports = parseImports(content, file);
  const functions: FunctionInfo[] = [];

  try {
    // 尝试用 acorn 解析（仅支持 JS）
    const ast = acorn.parse(content, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });

    walk.simple(ast, {
      FunctionDeclaration(node: any) {
        functions.push({
          name: node.id?.name || 'anonymous',
          line: node.loc?.start.line || 0,
          params: node.params.map((p: any) => p.name || 'unknown'),
          dependencies: extractDependencies(node, content),
        });
      },
      VariableDeclarator(node: any) {
        if (
          node.init &&
          (node.init.type === 'ArrowFunctionExpression' ||
            node.init.type === 'FunctionExpression')
        ) {
          functions.push({
            name: node.id?.name || 'anonymous',
            line: node.loc?.start.line || 0,
            params: node.init.params.map((p: any) => p.name || 'unknown'),
            dependencies: extractDependencies(node.init, content),
          });
        }
      },
    });
  } catch {
    // TypeScript 文件无法用 acorn 解析，使用正则回退
    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*\w+)?\s*=>/g;

    let funcMatch;
    while ((funcMatch = funcRegex.exec(content)) !== null) {
      const line = content.substring(0, funcMatch.index).split('\n').length;
      functions.push({
        name: funcMatch[1],
        line,
        params: funcMatch[2].split(',').map((p) => p.trim().split(':')[0].trim()).filter(Boolean),
        dependencies: [],
      });
    }

    while ((funcMatch = arrowRegex.exec(content)) !== null) {
      const line = content.substring(0, funcMatch.index).split('\n').length;
      functions.push({
        name: funcMatch[1],
        line,
        params: funcMatch[2].split(',').map((p) => p.trim().split(':')[0].trim()).filter(Boolean),
        dependencies: [],
      });
    }
  }

  return { file, imports, functions };
}

function extractDependencies(node: any, content: string): string[] {
  const deps: string[] = [];

  try {
    walk.simple(node, {
      CallExpression(callNode: any) {
        if (callNode.callee.type === 'Identifier') {
          deps.push(callNode.callee.name);
        } else if (callNode.callee.type === 'MemberExpression') {
          if (callNode.callee.object.type === 'Identifier') {
            deps.push(callNode.callee.object.name);
          }
        }
      },
    });
  } catch {
    // ignore walking errors
  }

  return [...new Set(deps)];
}
