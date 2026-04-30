# @cy873889292/ai-codereview

龙虾驱动的 AI Code Review CLI 工具，基于 MCP 架构实现自动化代码审查。

结合 AI 深度理解能力，从代码质量、架构设计、性能、安全规范、可维护性 5 大维度对项目进行全面审查，并生成结构化的 Markdown 报告。

## 安装

```bash
# 全局安装（推荐）
pnpm install @cy873889292/ai-codereview -g

# 或使用 npm
npm install @cy873889292/ai-codereview -g
```

## 快速开始

```bash
# 1. 在项目根目录创建配置文件
cat > .ai-codereview.json << 'EOF'
{
  "llm": {
    "provider": "openai",
    "apiKey": "your-api-key",
    "model": "gpt-4"
  }
}
EOF

# 2. 运行代码审查
ai-codereview

# 3. 查看生成的报告
cat code-review-report.md
```

## 配置

使用前需配置 LLM API Key，支持 OpenAI 和 Claude 两种提供商。

### 方式一：配置文件（推荐）

在项目根目录创建 `.ai-codereview.json`：

**OpenAI 配置示例：**

```json
{
  "llm": {
    "provider": "openai",
    "apiKey": "sk-xxxxxxxxxxxxxxxx",
    "model": "gpt-4",
    "baseURL": "https://api.openai.com/v1"
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

**Claude 配置示例：**

```json
{
  "llm": {
    "provider": "claude",
    "apiKey": "sk-ant-xxxxxxxxxxxxxxxx",
    "model": "claude-3-sonnet-20240229",
    "baseURL": "https://api.anthropic.com"
  }
}
```

> `baseURL` 为可选项，当使用代理或自定义 API 地址时填写。

### 方式二：环境变量

```bash
# OpenAI
export OPENAI_API_KEY=your-api-key

# 或 Claude
export ANTHROPIC_API_KEY=your-api-key
export AI_CODEREVIEW_PROVIDER=claude
```

**支持的环境变量：**

| 变量名 | 说明 |
| --- | --- |
| `AI_CODEREVIEW_API_KEY` | LLM API Key |
| `AI_CODEREVIEW_PROVIDER` | LLM 提供商（`openai` / `claude`） |
| `AI_CODEREVIEW_MODEL` | 模型名称 |
| `AI_CODEREVIEW_BASE_URL` | 自定义 API 地址 |
| `OPENAI_API_KEY` | OpenAI Key（回退） |
| `ANTHROPIC_API_KEY` | Claude Key（回退） |

### 评分权重自定义

通过 `scoring.weights` 可自定义 5 个维度的权重（总和应为 1）：

```json
{
  "scoring": {
    "weights": {
      "codeStyle": 0.15,
      "architecture": 0.25,
      "performance": 0.2,
      "security": 0.25,
      "maintainability": 0.15
    }
  }
}
```

## 使用

```bash
# 默认模式：基于 git diff 扫描变更文件
ai-codereview

# 全量扫描（扫描所有代码文件）
ai-codereview --full

# 严格模式（更严格的评分标准）
ai-codereview --strict

# 指定报告输出路径
ai-codereview -o ./reports/review.md

# 不生成 Markdown 报告（仅终端输出）
ai-codereview --no-report

# 低于指定等级则退出码为 1（用于 CI 卡点）
ai-codereview --fail-on B

# 组合使用
ai-codereview --full --strict --fail-on C -o review-report.md
```

### 参数说明

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--full` | 全量扫描所有代码文件 | `false` |
| `--diff` | 基于 git diff 扫描变更文件 | `true`（默认） |
| `--strict` | 更严格的评分标准 | `false` |
| `--fail-on <grade>` | 低于该等级退出码为 1（A-G） | - |
| `-o, --output <path>` | Markdown 报告输出路径 | `code-review-report.md` |
| `--no-report` | 不生成 Markdown 报告文件 | `false` |
| `-V, --version` | 显示版本号 | - |
| `-h, --help` | 显示帮助信息 | - |

## 审查维度

工具结合 AI 能力从 5 个维度对代码进行深度审查：

| 维度 | 审查内容 |
| --- | --- |
| **代码质量与规范** | 命名规范、DRY 原则、函数职责、魔法数字、注释质量、风格一致性 |
| **架构设计** | 模块划分、关注点分离、耦合度、循环依赖、设计模式、分层合理性 |
| **性能** | 内存泄漏、不必要的重渲染、大数据处理、异步操作、N+1 查询、缓存策略 |
| **安全规范** | XSS/CSRF/SQL 注入、敏感信息暴露、输入校验、权限控制、不安全函数 |
| **可维护性** | 可读性、技术债务、错误处理、TypeScript 类型完善度、扩展性 |

## 评分体系

总分 0-100，等级 A-G：

| 等级 | 分数范围 | 含义 |
| --- | --- | --- |
| **A** | 90-100 | 优秀 |
| **B** | 80-89 | 良好 |
| **C** | 70-79 | 一般 |
| **D** | 60-69 | 较差 |
| **E** | 50-59 | 差 |
| **F** | 30-49 | 很差 |
| **G** | 0-29 | 极差 |

评分由本地引擎计算，综合 ESLint 结果 + AI 分析结果 + 问题严重度，而非直接由 LLM 输出分数。

## 输出说明

### 终端输出

```
╔══════════════════════════════════════════════╗
║        AI Code Review Report                ║
║        龙虾驱动的代码审查                     ║
╚══════════════════════════════════════════════╝

  评分: B（82）
  扫描文件数: 12
  发现问题: 8

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

  报告已生成: /path/to/project/code-review-report.md
```

### Markdown 报告

每次审查会自动生成 `code-review-report.md`，包含以下内容：

- **总览** — 评分等级、扫描文件数、问题数量
- **分项评分** — 5 个维度的分数与评级
- **AI 总结** — 200-500 字的整体审查总结与改进优先级建议
- **问题列表** — 按严重度分组（CRITICAL → HIGH → MEDIUM → LOW → INFO），每个问题包含文件定位、详细描述、改进建议
- **ESLint 静态分析** — 表格形式列出所有 lint 问题

## Git Hook（pre-commit）

安装 pre-commit hook，提交代码时自动审查：

```bash
# 方式一：使用内置脚本
npm run install-hooks

# 方式二：手动添加到 .git/hooks/pre-commit
#!/bin/sh
npx ai-codereview --diff --fail-on D --no-report
```

## CI 集成

### GitHub Actions

```yaml
- name: AI Code Review
  run: npx @cy873889292/ai-codereview --diff --strict --fail-on C -o review-report.md
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

- name: Upload Review Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: code-review-report
    path: review-report.md
```

### GitLab CI

```yaml
code-review:
  script:
    - npx @cy873889292/ai-codereview --diff --strict --fail-on C -o review-report.md
  artifacts:
    paths:
      - review-report.md
    when: always
```

## 技术架构

```
┌──────────────┐
│   CLI 入口    │  commander + chalk + ora
├──────────────┤
│  Core Engine │  审查流程编排
├──────────────┤
│  MCP Server  │  工具调用架构
│  ├─ Registry │  工具注册中心
│  └─ Client   │  工具调用客户端
├──────────────┤
│  MCP Tools   │  git / filesystem / lint / ast
├──────────────┤
│ LLM Adapter  │  OpenAI / Claude 适配器
├──────────────┤
│ Score Engine │  本地评分计算
├──────────────┤
│   Reporter   │  终端输出 + Markdown 报告
└──────────────┘
```

- **MCP Server/Client** — 模型上下文协议工具调用架构
- **Tool Registry** — 可扩展的工具注册机制
- **MCP Tools** — git diff、文件读取、ESLint、AST 分析
- **LLM Adapter** — 支持 OpenAI / Claude，自动适配不同 SDK
- **Score Engine** — 本地评分计算（综合 ESLint + AI 分析，不依赖 LLM 直接评分）
- **Reporter** — 终端彩色输出 + 结构化 Markdown 报告

## 支持的文件类型

`.ts` `.tsx` `.js` `.jsx` `.vue` `.py` `.css` `.scss` `.less` `.html`

## License

MIT
