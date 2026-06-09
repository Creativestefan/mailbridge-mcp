#!/bin/bash
# Mailbridge — session start hook
# 1. Install MCP server dependencies if missing
# 2. Restart MCP server if plugin was updated since last session
# 3. Open setup portal automatically if no account is configured yet

MCP_DIR="${CLAUDE_PLUGIN_ROOT}/mcp"
CONFIG_FILE="$HOME/.mailbridge-accounts.json"
VERSION_STAMP="$HOME/.mailbridge-version"

# Install dependencies on first run
if [ ! -d "${MCP_DIR}/node_modules" ]; then
  cd "${MCP_DIR}" && npm install --silent 2>/dev/null
fi

# Detect version change — restart MCP server if updated
# Look for package.json in the standard layout (mcp/) or the repo root.
if [ -f "${MCP_DIR}/package.json" ]; then
  PKG_JSON="${MCP_DIR}/package.json"
else
  PKG_JSON="${CLAUDE_PLUGIN_ROOT}/package.json"
fi
CURRENT_VERSION=$(node -e "try{process.stdout.write(require('${PKG_JSON}').version)}catch(e){}" 2>/dev/null)
LAST_VERSION=$(cat "${VERSION_STAMP}" 2>/dev/null)

if [ -n "${CURRENT_VERSION}" ] && [ "${CURRENT_VERSION}" != "${LAST_VERSION}" ]; then
  echo "${CURRENT_VERSION}" > "${VERSION_STAMP}"
  # Kill the running MCP server via its PID file so Cowork restarts it
  # with the new code. Works regardless of install path layout.
  PID_FILE="$HOME/.mailbridge-server.pid"
  if [ -f "${PID_FILE}" ]; then
    OLD_PID=$(cat "${PID_FILE}" 2>/dev/null)
    if [ -n "${OLD_PID}" ]; then
      kill "${OLD_PID}" 2>/dev/null || true
    fi
  fi
  # Fallback: match either install layout by path
  pkill -f "${CLAUDE_PLUGIN_ROOT}.*index.js" 2>/dev/null || true
fi

# Open setup portal if no accounts are configured
# Config missing, or active is null = no account connected yet
if [ ! -f "$CONFIG_FILE" ] || grep -q '"active": null' "$CONFIG_FILE" 2>/dev/null; then
  node "${MCP_DIR}/setup.js" &
fi
