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
