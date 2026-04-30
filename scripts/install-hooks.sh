#!/bin/bash
# 安装 git pre-commit hook

HOOK_DIR=".git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"

if [ ! -d "$HOOK_DIR" ]; then
  echo "错误: 不是一个 git 仓库"
  exit 1
fi

cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# AI Code Review pre-commit hook

echo "🦞 Running AI Code Review..."

# 运行代码审查，如果等级低于 D 则阻止提交
npx ai-codereview --diff --fail-on D

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Code review failed. Please fix the issues before committing."
  exit 1
fi

echo "✅ Code review passed."
EOF

chmod +x "$HOOK_FILE"
echo "✅ Pre-commit hook installed successfully."
