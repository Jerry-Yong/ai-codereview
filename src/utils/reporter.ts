import chalk from 'chalk';
import { ReviewResult } from '../core';
import { Grade, ReviewIssue, ScoreResult } from '../types';

export class Reporter {
  private result: ReviewResult;

  constructor(result: ReviewResult) {
    this.result = result;
  }

  print(): void {
    this.printHeader();
    this.printOverview();
    this.printDimensions();
    this.printIssues();
    this.printSummary();
    this.printFooter();
  }

  toMarkdown(): string {
    const { score, issues, summary, lintIssues, filesAnalyzed } = this.result;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const lines: string[] = [];

    lines.push('# AI Code Review Report');
    lines.push('');
    lines.push(`> 生成时间: ${dateStr}  `);
    lines.push(`> Powered by AI Code Review - 龙虾驱动`);
    lines.push('');

    // 总览
    lines.push('## 总览');
    lines.push('');
    lines.push(`| 指标 | 结果 |`);
    lines.push(`| --- | --- |`);
    lines.push(`| **评分等级** | **${score.grade}**（${score.totalScore} 分） |`);
    lines.push(`| 扫描文件数 | ${filesAnalyzed} |`);
    lines.push(`| 发现问题数 | ${issues.length} |`);
    lines.push(`| ESLint 问题 | ${lintIssues.length} |`);
    lines.push('');

    // 分项评分
    lines.push('## 分项评分');
    lines.push('');
    lines.push(`| 维度 | 分数 | 评级 |`);
    lines.push(`| --- | --- | --- |`);
    lines.push(`| 代码规范 | ${score.dimensions.codeStyle} | ${this.mdScoreEmoji(score.dimensions.codeStyle)} |`);
    lines.push(`| 架构设计 | ${score.dimensions.architecture} | ${this.mdScoreEmoji(score.dimensions.architecture)} |`);
    lines.push(`| 性能 | ${score.dimensions.performance} | ${this.mdScoreEmoji(score.dimensions.performance)} |`);
    lines.push(`| 安全 | ${score.dimensions.security} | ${this.mdScoreEmoji(score.dimensions.security)} |`);
    lines.push(`| 可维护性 | ${score.dimensions.maintainability} | ${this.mdScoreEmoji(score.dimensions.maintainability)} |`);
    lines.push('');

    // AI 总结
    if (summary) {
      lines.push('## AI 总结');
      lines.push('');
      lines.push(summary);
      lines.push('');
    }

    // 问题列表
    if (issues.length > 0) {
      lines.push('## 问题列表');
      lines.push('');

      const sortedIssues = [...issues].sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
      });

      // 按严重度分组
      const groups: Record<string, ReviewIssue[]> = {};
      for (const issue of sortedIssues) {
        if (!groups[issue.severity]) groups[issue.severity] = [];
        groups[issue.severity].push(issue);
      }

      const severityLabels: Record<string, string> = {
        critical: 'CRITICAL - 严重问题',
        high: 'HIGH - 高优先级',
        medium: 'MEDIUM - 中等问题',
        low: 'LOW - 建议改进',
        info: 'INFO - 信息与亮点',
      };

      for (const severity of ['critical', 'high', 'medium', 'low', 'info']) {
        const group = groups[severity];
        if (!group || group.length === 0) continue;

        lines.push(`### ${severityLabels[severity] || severity.toUpperCase()}（${group.length} 个）`);
        lines.push('');

        for (const issue of group) {
          const typeLabel = this.mdTypeLabel(issue.type);
          lines.push(`#### \`${issue.file}:${issue.line}\` [${typeLabel}]`);
          lines.push('');
          lines.push(`**问题**: ${issue.message}`);
          lines.push('');
          if (issue.suggestion) {
            lines.push(`**建议**: ${issue.suggestion}`);
            lines.push('');
          }
          lines.push('---');
          lines.push('');
        }
      }
    } else {
      lines.push('## 问题列表');
      lines.push('');
      lines.push('未发现显著问题。');
      lines.push('');
    }

    // ESLint 问题
    if (lintIssues.length > 0) {
      lines.push('## ESLint 静态分析');
      lines.push('');
      lines.push(`| 文件 | 行:列 | 级别 | 规则 | 描述 |`);
      lines.push(`| --- | --- | --- | --- | --- |`);
      for (const issue of lintIssues.slice(0, 50)) {
        lines.push(`| ${issue.file} | ${issue.line}:${issue.column} | ${issue.severity} | ${issue.ruleId || '-'} | ${issue.message} |`);
      }
      if (lintIssues.length > 50) {
        lines.push('');
        lines.push(`> ... 还有 ${lintIssues.length - 50} 个 ESLint 问题未列出`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private mdScoreEmoji(score: number): string {
    if (score >= 90) return 'A - 优秀';
    if (score >= 80) return 'B - 良好';
    if (score >= 70) return 'C - 一般';
    if (score >= 60) return 'D - 较差';
    return 'F - 需改进';
  }

  private mdTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      codeStyle: '代码规范',
      architecture: '架构设计',
      performance: '性能',
      security: '安全',
      maintainability: '可维护性',
    };
    return labels[type] || type;
  }

  private printHeader(): void {
    console.log('');
    console.log(chalk.bold.cyan('╔══════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║        AI Code Review Report                ║'));
    console.log(chalk.bold.cyan('║        龙虾驱动的代码审查                     ║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════════╝'));
    console.log('');
  }

  private printOverview(): void {
    const { score } = this.result;
    const gradeColor = this.getGradeColor(score.grade);

    console.log(chalk.bold('  评分: ') + gradeColor(`${score.grade}（${score.totalScore}）`));
    console.log(chalk.gray(`  扫描文件数: ${this.result.filesAnalyzed}`));
    console.log(chalk.gray(`  发现问题: ${this.result.issues.length}`));
    console.log('');
  }

  private printDimensions(): void {
    const { dimensions } = this.result.score;

    console.log(chalk.bold('  分项评分:'));
    console.log(`    ${this.scoreBar('代码规范', dimensions.codeStyle)}`);
    console.log(`    ${this.scoreBar('架构设计', dimensions.architecture)}`);
    console.log(`    ${this.scoreBar('性能', dimensions.performance)}`);
    console.log(`    ${this.scoreBar('安全', dimensions.security)}`);
    console.log(`    ${this.scoreBar('可维护性', dimensions.maintainability)}`);
    console.log('');
  }

  private printIssues(): void {
    const { issues } = this.result;

    if (issues.length === 0) {
      console.log(chalk.green('  没有发现显著问题。'));
      console.log('');
      return;
    }

    console.log(chalk.bold('  问题列表:'));
    console.log(chalk.gray('  ─────────────────────────────────────'));

    // 按严重度排序
    const sortedIssues = [...issues].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return order[a.severity] - order[b.severity];
    });

    const maxDisplay = 15;
    const displayIssues = sortedIssues.slice(0, maxDisplay);

    for (const issue of displayIssues) {
      const severityTag = this.getSeverityTag(issue.severity);
      console.log(`  ${severityTag} ${chalk.white(issue.file)}:${chalk.yellow(String(issue.line))}`);
      console.log(`    ${chalk.white(issue.message)}`);
      if (issue.suggestion) {
        console.log(`    ${chalk.gray('建议: ' + issue.suggestion)}`);
      }
      console.log('');
    }

    if (issues.length > maxDisplay) {
      console.log(chalk.gray(`  ... 还有 ${issues.length - maxDisplay} 个问题未显示`));
      console.log('');
    }
  }

  private printSummary(): void {
    if (this.result.summary) {
      console.log(chalk.bold('  AI 总结:'));
      console.log(chalk.gray('  ─────────────────────────────────────'));
      // 分行输出，每行前加缩进
      const lines = this.result.summary.split('\n');
      for (const line of lines) {
        console.log(`  ${line}`);
      }
      console.log('');
    }
  }

  private printFooter(): void {
    console.log(chalk.gray('  ─────────────────────────────────────'));
    console.log(chalk.gray('  Powered by AI Code Review - 龙虾驱动'));
    console.log('');
  }

  private scoreBar(label: string, score: number): string {
    const barLength = 20;
    const filled = Math.round((score / 100) * barLength);
    const empty = barLength - filled;

    const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    const bar = color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));

    return `${label.padEnd(8)} ${bar} ${color(String(score))}`;
  }

  private getSeverityTag(severity: string): string {
    switch (severity) {
      case 'critical':
        return chalk.bgRed.white(' CRITICAL ');
      case 'high':
        return chalk.red('[HIGH]');
      case 'medium':
        return chalk.yellow('[MEDIUM]');
      case 'low':
        return chalk.blue('[LOW]');
      case 'info':
        return chalk.gray('[INFO]');
      default:
        return chalk.gray(`[${severity.toUpperCase()}]`);
    }
  }

  private getGradeColor(grade: Grade): typeof chalk.green {
    switch (grade) {
      case 'A':
        return chalk.green;
      case 'B':
        return chalk.greenBright;
      case 'C':
        return chalk.yellow;
      case 'D':
        return chalk.yellowBright;
      case 'E':
        return chalk.red;
      case 'F':
        return chalk.redBright;
      case 'G':
        return chalk.bgRed.white;
      default:
        return chalk.white;
    }
  }
}
