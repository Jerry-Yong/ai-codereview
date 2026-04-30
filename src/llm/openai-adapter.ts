import { LLMConfig, LLMAnalysisInput, LLMAnalysisOutput } from '../types';
import { LLMAdapter } from './index';
import { buildPrompt } from './prompt-builder';

export class OpenAIAdapter implements LLMAdapter {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async analyze(input: LLMAnalysisInput): Promise<LLMAnalysisOutput> {
    const prompt = buildPrompt(input);

    // 动态导入 openai
    const { default: OpenAI } = await import('openai');

    const client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
    });

    const response = await client.chat.completions.create({
      model: this.config.model || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: '你是专业的代码审查工程师，请严格按照 JSON 格式输出分析结果。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response');
    }

    return this.parseResponse(content);
  }

  private parseResponse(content: string): LLMAnalysisOutput {
    try {
      // 尝试清理 markdown 代码块
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
        `Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
