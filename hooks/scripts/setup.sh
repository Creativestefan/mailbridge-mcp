#!/bin/bash
# Mailbridge — session start hook
# 1. Install MCP server dependencies if missing
# 2. Open setup portal automatically if no account is configured yet

MCP_DIR="${CLAUDE_PLUGIN_ROOT}/mcp"
CONFIG_FILE="$HOME/.universal-email-accounts.json"

# Install dependencies on first run
if [ ! -d "${MCP_DIR}/node_modules" ]; then
  cd "${MCP_DIR}" && npm install --silent 2>/dev/null
fi

# Open setup portal if no accounts are configured
# Config missing, or active is null = no account connected yet
if [ ! -f "$CONFIG_FILE" ] || grep -q '"active": null' "$CONFIG_FILE" 2>/dev/null; then
  node "${MCP_DIR}/setup.js" &
fi
