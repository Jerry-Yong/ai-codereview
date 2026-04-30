import * as fs from 'fs';
import * as path from 'path';
import { AppConfig, LLMProvider } from '../types';

const CONFIG_FILE_NAME = '.ai-codereview.json';

const DEFAULT_CONFIG: AppConfig = {
  llm: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
  },
  eslint: {},
  scoring: {
    weights: {
      codeStyle: 0.2,
      architecture: 0.2,
      performance: 0.2,
      security: 0.2,
      maintainability: 0.2,
    },
  },
};

export function loadConfig(): AppConfig {
  const config = { ...DEFAULT_CONFIG };

  // 1. 从配置文件加载
  const configPath = findConfigFile();
  if (configPath) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      mergeConfig(config, fileConfig);
    } catch {
      // 配置文件解析失败，使用默认配置
    }
  }

  // 2. 从环境变量加载（优先级更高）
  if (process.env.AI_CODEREVIEW_PROVIDER) {
    config.llm.provider = process.env.AI_CODEREVIEW_PROVIDER as LLMProvider;
  }
  if (process.env.AI_CODEREVIEW_API_KEY) {
    config.llm.apiKey = process.env.AI_CODEREVIEW_API_KEY;
  }
  if (process.env.AI_CODEREVIEW_MODEL) {
    config.llm.model = process.env.AI_CODEREVIEW_MODEL;
  }
  if (process.env.AI_CODEREVIEW_BASE_URL) {
    config.llm.baseURL = process.env.AI_CODEREVIEW_BASE_URL;
  }

  // 兼容常见环境变量
  if (!config.llm.apiKey) {
    if (config.llm.provider === 'openai' && process.env.OPENAI_API_KEY) {
      config.llm.apiKey = process.env.OPENAI_API_KEY;
    }
    if (config.llm.provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
      config.llm.apiKey = process.env.ANTHROPIC_API_KEY;
    }
  }

  return config;
}

function findConfigFile(): string | null {
  let dir = process.cwd();

  while (true) {
    const configPath = path.join(dir, CONFIG_FILE_NAME);
    if (fs.existsSync(configPath)) {
      return configPath;
    }

    const parentDir = path.dirname(dir);
    if (parentDir === dir) break;
    dir = parentDir;
  }

  // 检查 home 目录
  const homeConfig = path.join(process.env.HOME || '', CONFIG_FILE_NAME);
  if (fs.existsSync(homeConfig)) {
    return homeConfig;
  }

  return null;
}

function mergeConfig(target: AppConfig, source: Partial<AppConfig>): void {
  if (source.llm) {
    Object.assign(target.llm, source.llm);
  }
  if (source.eslint) {
    Object.assign(target.eslint, source.eslint);
  }
  if (source.scoring?.weights) {
    Object.assign(target.scoring.weights, source.scoring.weights);
  }
}
