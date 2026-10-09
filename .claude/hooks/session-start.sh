#!/bin/bash
set -euo pipefail

# Only run in Claude Code cloud sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

export PATH="$HOME/.local/bin:$PATH"

# Tavily CLI (tvly)
if ! command -v tvly >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then
    uv tool install tavily-cli
  else
    pip install --user tavily-cli
  fi
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE"
fi
