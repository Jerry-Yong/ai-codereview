import * as fs from 'fs';
import * as path from 'path';
import { MCPTool, ToolResult } from '../../types';

export const readFileTool: MCPTool = {
  name: 'read_file',
  description: '读取指定路径的文件内容',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: '文件路径（相对于项目根目录）',
      },
    },
    required: ['path'],
  },
  handler: async (input): Promise<ToolResult> => {
    try {
      const filePath = path.resolve(process.cwd(), input.path as string);

      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          data: null,
          error: `File not found: ${filePath}`,
        };
      }

      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        return {
          success: false,
          data: null,
          error: `Path is a directory: ${filePath}`,
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');

      return {
        success: true,
        data: {
          path: input.path,
          content,
          size: stat.size,
          lines: content.split('\n').length,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to read file',
      };
    }
  },
};

export const listFilesTool: MCPTool = {
  name: 'list_files',
  description: '列出项目中的文件（排除 node_modules、dist 等）',
  inputSchema: {
    type: 'object',
    properties: {
      directory: {
        type: 'string',
        description: '目录路径（默认为项目根目录）',
      },
      extensions: {
        type: 'string',
        description: '文件扩展名过滤（逗号分隔，如 ts,js,tsx）',
      },
    },
  },
  handler: async (input): Promise<ToolResult> => {
    try {
      const dir = path.resolve(process.cwd(), (input.directory as string) || '.');
      const extensions = input.extensions
        ? (input.extensions as string).split(',').map((e) => `.${e.trim()}`)
        : null;

      const ignoreDirs = new Set([
        'node_modules',
        'dist',
        '.git',
        'coverage',
        '.next',
        'build',
        '.turbo',
      ]);

      const files: Array<{ path: string; size: number }> = [];

      function walkDir(currentDir: string, relativePath: string): void {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
          if (ignoreDirs.has(entry.name)) continue;
          if (entry.name.startsWith('.') && entry.name !== '.eslintrc.js') continue;

          const fullPath = path.join(currentDir, entry.name);
          const relPath = path.join(relativePath, entry.name);

          if (entry.isDirectory()) {
            walkDir(fullPath, relPath);
          } else if (entry.isFile()) {
            if (extensions) {
              const ext = path.extname(entry.name);
              if (!extensions.includes(ext)) continue;
            }
            const stat = fs.statSync(fullPath);
            files.push({ path: relPath, size: stat.size });
          }
        }
      }

      walkDir(dir, '');

      return {
        success: true,
        data: {
          directory: dir,
          totalFiles: files.length,
          files,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to list files',
      };
    }
  },
};
