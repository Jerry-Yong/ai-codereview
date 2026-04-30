import { LLMConfig, LLMAnalysisInput, LLMAnalysisOutput } from '../types';

export interface LLMAdapter {
  analyze(input: LLMAnalysisInput): Promise<LLMAnalysisOutput>;
}

export function createLLMAdapter(config: LLMConfig): LLMAdapter {
  if (config.provider === 'openai') {
    const { OpenAIAdapter } = require('./openai-adapter');
    return new OpenAIAdapter(config);
  } else if (config.provider === 'claude') {
    const { ClaudeAdapter } = require('./claude-adapter');
    return new ClaudeAdapter(config);
  }
  throw new Error(`Unsupported LLM provider: ${config.provider}`);
}

export { buildPrompt } from './prompt-builder';
export { OpenAIAdapter } from './openai-adapter';
export { ClaudeAdapter } from './claude-adapter';
