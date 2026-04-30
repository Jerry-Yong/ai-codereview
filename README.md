# @cy873889292/ai-codereview

龙虾驱动的 AI Code Review CLI 工具，基于 MCP 架构实现自动化代码审查。

## 安装

```bash
# 全局安装
pnpm install @cy873889292/ai-codereview -g

# 或使用 npm
npm install @cy873889292/ai-codereview -g
```

## 配置

使用前需配置 LLM API Key，支持 OpenAI 和 Claude：

### 方式一：环境变量

```bash
# OpenAI
export OPENAI_API_KEY=your-api-key

# 或 Claude
export ANTHROPIC_API_KEY=your-api-key
export AI_CODEREVIEW_PROVIDER=claude
```

### 方式二：配置文件

在项目根目录或 home 目录创建 `.ai-codereview.json`：

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "your-api-key",
    "model": "gpt-4"
  },
  "scoring": {
    "weights": {
      "codeStyle": 0.2,
      "architecture": 0.2,
      "performance": 0.2,
      "security": 0.2,
      "maintainability": 0.2
    }
  }
}
```

支持的环境变量：

| 变量名 | 说明 |
| --- | --- |
| `AI_CODEREVIEW_API_KEY` | LLM API Key |
| `AI_CODEREVIEW_PROVIDER` | LLM 提供商（openai / claude） |
| `AI_CODEREVIEW_MODEL` | 模型名称 |
| `AI_CODEREVIEW_BASE_URL` | 自定义 API 地址 |
| `OPENAI_API_KEY` | OpenAI Key（回退） |
| `ANTHROPIC_API_KEY` | Claude Key（回退） |

## 使用

```bash
# 进入项目目录后执行
ai-codereview

# 全量扫描（扫描所有文件）
ai-codereview --full

# 严格模式
ai-codereview --strict

# 低于指定等级则退出码为1（用于 CI）
ai-codereview --fail-on B
```

### 参数说明

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--full` | 全量扫描所有代码文件 | `false` |
| `--diff` | 基于 git diff 扫描 | `true` |
| `--strict` | 更严格的评分标准 | `false` |
| `--fail-on <grade>` | 低于该等级退出码为1（A-G） | - |

## 评分体系

工具会从5个维度对代码进行评分：

- **代码规范** - 基于 ESLint 检查结果
- **架构设计** - AI 分析代码架构合理性
- **性能** - AI + AST 分析性能问题
- **安全** - 规则 + AI 识别安全漏洞
- **可维护性** - AST + AI 评估可维护性

总分 0-100，等级 A-G：

| 等级 | 分数 |
| --- | --- |
| A | 90+ |
| B | 80+ |
| C | 70+ |
| D | 60+ |
| E | 50+ |
| F | 30+ |
| G | <30 |

## 输出示例

```
╔══════════════════════════════════════════════╗
║        AI Code Review Report                ║
║        龙虾驱动的代码审查                     ║
╚══════════════════════════════════════════════╝

  评分: B（82）
  扫描文件数: 12
  发现问题: 5

  分项评分:
    代码规范 ████████████████░░░░ 85
    架构设计 ███████████████░░░░░ 78
    性能     ████████████████░░░░ 80
    安全     ██████████████████░░ 90
    可维护性 ███████████████░░░░░ 77

  [HIGH] src/api/auth.ts:42
    密码未进行哈希处理直接存储
    建议: 使用 bcrypt 对密码进行哈希后再存储

  [MEDIUM] src/utils/request.ts:15
    未对用户输入进行 XSS 过滤
    建议: 使用 DOMPurify 或类似库对输入进行转义
```

## Git Hook（pre-commit）

安装 pre-commit hook，提交代码时自动审查：

```bash
# 方式一：使用内置脚本
npm run install-hooks

# 方式二：手动添加到 .git/hooks/pre-commit
npx ai-codereview --diff --fail-on D
```

## CI 集成

在 GitHub Actions 中使用：

```yaml
- name: AI Code Review
  run: npx @cy873889292/ai-codereview --diff --strict --fail-on C
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## 技术架构

- **MCP Server/Client** - 工具调用架构
- **Tool Registry** - 可扩展的工具注册机制
- **MCP Tools** - git、filesystem、lint、ast 工具
- **LLM Adapter** - 支持 OpenAI / Claude
- **Score Engine** - 本地评分计算（不依赖 LLM 直接评分）

## License

MIT
