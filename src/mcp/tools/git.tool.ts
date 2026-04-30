import { execSync } from 'child_process';
import { MCPTool, GitDiff, ChangedFile, ToolResult } from '../../types';

export const getDiffTool: MCPTool = {
  name: 'get_diff',
  description: '获取当前 git 仓库的 diff 内容，返回结构化的文件变更信息',
  inputSchema: {
    type: 'object',
    properties: {
      staged: {
        type: 'string',
        description: '是否仅获取暂存区的 diff（true/false）',
      },
    },
  },
  handler: async (input): Promise<ToolResult> => {
    try {
      const staged = input.staged === 'true';
      const diffCmd = staged ? 'git diff --cached --stat' : 'git diff --stat';
      const diffContentCmd = staged ? 'git diff --cached' : 'git diff';

      const stat = execSync(diffCmd, { encoding: 'utf-8' });
      const content = execSync(diffContentCmd, { encoding: 'utf-8' });

      const diffs: GitDiff[] = parseDiffStat(stat, content);

      return {
        success: true,
        data: diffs,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get git diff',
      };
    }
  },
};

export const getChangedFilesTool: MCPTool = {
  name: 'get_changed_files',
  description: '获取当前 git 仓库中变更的文件列表',
  inputSchema: {
    type: 'object',
    properties: {
      includeUntracked: {
        type: 'string',
        description: '是否包含未追踪的文件（true/false）',
      },
    },
  },
  handler: async (input): Promise<ToolResult> => {
    try {
      const files: ChangedFile[] = [];

      // 获取已修改的文件
      const modified = execSync('git diff --name-status', { encoding: 'utf-8' });
      const staged = execSync('git diff --cached --name-status', { encoding: 'utf-8' });

      const parseStatus = (output: string): void => {
        const lines = output.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const [status, ...pathParts] = line.split('\t');
          const path = pathParts.join('\t');
          if (!path) continue;

          let fileStatus: ChangedFile['status'];
          switch (status.charAt(0)) {
            case 'A':
              fileStatus = 'added';
              break;
            case 'M':
              fileStatus = 'modified';
              break;
            case 'D':
              fileStatus = 'deleted';
              break;
            case 'R':
              fileStatus = 'renamed';
              break;
            default:
              fileStatus = 'modified';
          }

          // 避免重复
          if (!files.find((f) => f.path === path)) {
            files.push({ path, status: fileStatus });
          }
        }
      };

      parseStatus(modified);
      parseStatus(staged);

      // 获取未追踪文件
      if (input.includeUntracked === 'true') {
        const untracked = execSync('git ls-files --others --exclude-standard', {
          encoding: 'utf-8',
        });
        const untrackedFiles = untracked.trim().split('\n').filter(Boolean);
        for (const path of untrackedFiles) {
          if (!files.find((f) => f.path === path)) {
            files.push({ path, status: 'added' });
          }
        }
      }

      return {
        success: true,
        data: files,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get changed files',
      };
    }
  },
};

function parseDiffStat(stat: string, fullContent: string): GitDiff[] {
  const diffs: GitDiff[] = [];
  const fileSections = fullContent.split('diff --git');

  for (const section of fileSections) {
    if (!section.trim()) continue;

    const fileMatch = section.match(/a\/(.+?) b\//);
    if (!fileMatch) continue;

    const file = fileMatch[1];
    const additions = (section.match(/^\+[^+]/gm) || []).length;
    const deletions = (section.match(/^-[^-]/gm) || []).length;

    diffs.push({
      file,
      additions,
      deletions,
      content: section,
    });
  }

  return diffs;
}
