#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs';
import { CodeReviewEngine } from '../core';
import { loadConfig, Reporter } from '../utils';
import { shouldFail } from '../scoring';
import { CLIOptions, Grade } from '../types';

// 动态读取 package.json 中的版本号
const pkg = require(path.resolve(__dirname, '../../package.json'));

const program = new Command();

program
  .name('ai-codereview')
  .description('龙虾驱动的 AI Code Review CLI 工具')
  .version(pkg.version)
  .option('--full', '全量扫描（扫描所有文件）', false)
  .option('--diff', '基于 git diff 扫描（默认）', true)
  .option('--strict', '使用更严格的评分标准', false)
  .option('--fail-on <grade>', '低于该等级则退出码为1（A-G）')
  .option('-o, --output <path>', '输出 Markdown 报告文件路径（默认: code-review-report.md）')
  .option('--no-report', '不生成 Markdown 报告文件')
  .action(async (opts) => {
    await runReview(opts);
  });

async function runReview(opts: { full: boolean; diff: boolean; strict: boolean; failOn?: string; output?: string; report?: boolean }): Promise<void> {
  console.log('');
  console.log(chalk.bold.cyan('  🦞 龙虾驱动的 AI Code Review'));
  console.log(chalk.gray('  正在分析项目代码...'));
  console.log('');

  // 加载配置
  const config = loadConfig();

  // 校验 API Key
  if (!config.llm.apiKey) {
    console.log(chalk.red('  错误: 未配置 LLM API Key'));
    console.log('');
    console.log(chalk.yellow('  请通过以下方式配置:'));
    console.log(chalk.gray('    1. 设置环境变量: AI_CODEREVIEW_API_KEY=your-key'));
    console.log(chalk.gray('    2. 或设置: OPENAI_API_KEY=your-key (OpenAI)'));
    console.log(chalk.gray('    3. 或设置: ANTHROPIC_API_KEY=your-key (Claude)'));
    console.log(chalk.gray('    4. 或创建配置文件: .ai-codereview.json'));
    console.log('');
    process.exit(1);
  }

  const options: CLIOptions = {
    full: opts.full,
    diff: !opts.full,
    strict: opts.strict,
    failOn: opts.failOn as Grade | undefined,
  };

  // 校验 fail-on 参数
  if (options.failOn) {
    const validGrades: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    if (!validGrades.includes(options.failOn)) {
      console.log(chalk.red(`  错误: 无效的等级 "${options.failOn}"，有效值为 A-G`));
      process.exit(1);
    }
  }

  const spinner = ora({
    text: '正在收集代码信息...',
    prefixText: ' ',
  }).start();

  try {
    const engine = new CodeReviewEngine(config, options);

    spinner.text = '正在执行静态分析...';
    // 分阶段更新 spinner 状态，但实际是一次性执行
    const result = await engine.run();

    spinner.succeed('分析完成');
    console.log('');

    // 输出报告
    const reporter = new Reporter(result);
    reporter.print();

    // 生成 Markdown 报告文件
    if (opts.report !== false) {
      const outputPath = opts.output || 'code-review-report.md';
      const resolvedPath = path.resolve(process.cwd(), outputPath);
      const markdown = reporter.toMarkdown();
      fs.writeFileSync(resolvedPath, markdown, 'utf-8');
      console.log(chalk.green(`  报告已生成: ${resolvedPath}`));
      console.log('');
    }

    // 检查是否需要失败退出
    if (options.failOn && shouldFail(result.score.grade, options.failOn)) {
      console.log(
        chalk.red(
          `  退出: 评分等级 ${result.score.grade} 低于要求的 ${options.failOn}`
        )
      );
      console.log('');
      process.exit(1);
    }
  } catch (error) {
    spinner.fail('分析失败');
    console.log('');
    if (error instanceof Error) {
      console.log(chalk.red(`  错误: ${error.message}`));
      if (process.env.DEBUG) {
        console.log(chalk.gray(error.stack || ''));
      }
    }
    console.log('');
    process.exit(1);
  }
}

program.parse();
