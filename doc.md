
一、总体需求描述
请使用NextJS帮我实现一个“龙虾驱动的 AI Code Review CLI 工具”，用于在本地项目中执行代码审查。

工具使用方式：
在终端进入项目目录后，执行： ai-codereview

工具目标：
对当前项目进行自动化代码审查，并输出结构化分析结果和项目评分（A-G等级）。

该系统必须基于以下架构理念：
1. 使用 MCP（Model Context Protocol）实现工具调用能力
2. 使用 LLM（如 OpenAI 或 Claude）进行代码推理分析
3. 使用本地静态分析（ESLint / AST）提供基础规则判断
4. 最终输出结构化结果 + 评分体系
5. 
二、核心功能需求（强约束）
   请实现以下核心功能模块：
1）CLI 工具
   实现一个 Node.js CLI 工具：

要求：
- 命令名称：ai-codereview
- 支持参数：
  --full（全量扫描）
  --diff（默认，基于 git diff）
  --strict（更严格评分）
  --fail-on <等级>（低于该等级则退出码为1）

技术要求：
- 使用 commander 或 yargs
- 使用 chalk 美化终端输出
- 
2）MCP 架构（必须实现）
  实现 MCP（Model Context Protocol）风格的架构：

需要包含：

1. MCP Server（本地 Node 服务）
2. MCP Client（CLI 内调用）
3. Tool Registry（工具注册机制）

每个 Tool 必须包含：
- name
- description
- input schema
- handler 方法

不要简化为普通函数调用，必须体现“工具调用架构”

3）MCP Tools（必须实现）
实现以下工具（通过 MCP 暴露）：

1. Git 工具
- get_diff()
- get_changed_files()

2. 文件系统工具
- read_file(path)
- list_files()

3. Lint 工具
- run_eslint()

4. AST 工具（至少实现基础能力）
- get_function_dependencies(file)
  或
- get_imports(file)

要求：
- 工具返回结构化数据
- 不要返回纯文本
- 
4）代码分析流程（核心逻辑）
  实现完整执行流程：

1. 获取代码范围（git diff 或全量）
2. 调用 MCP tools 获取上下文
3. 执行 ESLint
4. 构建 AI 输入（prompt）
5. 调用 LLM
6. 返回结构化问题列表
7. 进行评分计算
8. 输出 CLI 报告

5）LLM 调用层
   实现 LLM Adapter：

要求：
- 支持 OpenAI 或 Claude
- 使用结构化输出（JSON）

Prompt 必须包含：
- 代码上下文
- lint 结果
- 分析目标（架构 / 性能 / 安全 / 可维护性）

LLM 输出必须是：

[
{
file,
line,
type,
severity,
message,
suggestion
}
]

6）评分系统（必须工程化实现）
实现评分系统（Score Engine）：

评分维度：
- codeStyle（来自 ESLint）
- architecture（来自 AI）
- performance（AI + AST）
- security（规则 or AI）
- maintainability（AST + AI）

输出：
- 总分（0-100）
- 等级（A-G）

等级规则：
A: 90+
B: 80+
C: 70+
D: 60+
E: 50+
F: 30+
G: <30

注意：
- 不允许 LLM 直接输出最终评分
- 必须由本地逻辑计算

7）CLI 输出（必须规范）
  输出格式：

1. 概览

AI Code Review Report
评分：B（82）

分项：
- 代码规范：85
- 架构设计：78
- 性能：80
- 安全：90
- 可维护性：77

2. 问题列表

[HIGH] file:line
问题描述
建议

3. AI 总结

一段总结说明项目整体质量

三、项目结构要求（非常关键）
请按模块化方式输出项目结构：

/ai-codereview
/cli
/core
/mcp
/server
/client
/tools
/llm
/scoring
/utils

要求：
- 每个模块职责清晰
- 不要写成单文件
  四、代码质量要求（限制 AI 输出垃圾代码）
  代码必须满足：

- 使用 TypeScript
- 清晰的类型定义
- 不允许 any 滥用
- 每个模块有明确职责
- 不要写伪代码
- 所有核心模块必须提供可运行实现
- 
五、其它
1. Git Hook 支持（pre-commit）
2. CI 支持（失败退出）
3. 工具扩展机制（支持新增 MCP tools）
4. 
六、输出要求（非常关键）
   请按以下顺序输出：

1. 项目结构说明
2. 每个模块代码（分文件）
3. 关键逻辑说明（简要）
4. 如何运行项目（步骤）

不要省略代码，不要只写示例，需要一个可以直接运行的项目。