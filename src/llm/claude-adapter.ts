import { LLMConfig, LLMAnalysisInput, LLMAnalysisOutput } from '../types';
import { LLMAdapter } from './index';
import { buildPrompt } from './prompt-builder';

export class ClaudeAdapter implements LLMAdapter {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async analyze(input: LLMAnalysisInput): Promise<LLMAnalysisOutput> {
    const prompt = buildPrompt(input);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');

    const client = new Anthropic({
      apiKey: this.config.apiKey,
    });

    const response: Record<string, unknown> = await client.messages.create({
      model: this.config.model || 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system: '你是专业的代码审查工程师，请严格按照纯 JSON 格式输出分析结果，不要使用 markdown 代码块包裹。',
    });

    const content = response.content as Array<{ type: string; text?: string }>;
    const textBlock = content.find((block: { type: string }) => block.type === 'text');
    if (!textBlock || !textBlock.text) {
      throw new Error('Claude returned empty response');
    }

    return this.parseResponse(textBlock.text);
  }

  private parseResponse(content: string): LLMAnalysisOutput {
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleaned);

      return {
        issues: (parsed.issues || []).map((issue: Record<string, unknown>) => ({
          file: String(issue.file || ''),
          line: Number(issue.line) || 0,
          type: issue.type || 'maintainability',
          severity: issue.severity || 'medium',
          message: String(issue.message || ''),
          suggestion: String(issue.suggestion || ''),
        })),
        summary: String(parsed.summary || ''),
        dimensionScores: {
          architecture: Number(parsed.dimensionScores?.architecture) || 70,
          performance: Number(parsed.dimensionScores?.performance) || 70,
          security: Number(parsed.dimensionScores?.security) || 70,
          maintainability: Number(parsed.dimensionScores?.maintainability) || 70,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to parse Claude response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
