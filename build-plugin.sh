#!/bin/bash
# Mailbridge — Plugin Builder
# Assembles mailbridge.plugin from the source repo
# Output: /tmp/mailbridge.plugin

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGING_DIR="$(mktemp -d)"
OUTPUT="/tmp/mailbridge.plugin"

echo "🔧 Building Mailbridge plugin..."

# Build setup-ui if dist is missing or stale
if [ ! -d "${REPO_DIR}/setup-ui/dist" ]; then
  echo "   Building setup-ui..."
  cd "${REPO_DIR}/setup-ui" && npm run build --silent
  cd "${REPO_DIR}"
fi

# Plugin root assets
cp "${REPO_DIR}/.mcp.json" "${STAGING_DIR}/.mcp.json"
cp -r "${REPO_DIR}/.claude-plugin" "${STAGING_DIR}/.claude-plugin"
cp -r "${REPO_DIR}/hooks" "${STAGING_DIR}/hooks"
cp -RL "${REPO_DIR}/skills" "${STAGING_DIR}/skills"

# MCP server under mcp/
mkdir -p "${STAGING_DIR}/mcp"
cp "${REPO_DIR}/index.js" "${STAGING_DIR}/mcp/index.js"
cp "${REPO_DIR}/setup.js" "${STAGING_DIR}/mcp/setup.js"
cp "${REPO_DIR}/package.json" "${STAGING_DIR}/mcp/package.json"
cp "${REPO_DIR}/package-lock.json" "${STAGING_DIR}/mcp/package-lock.json"
cp -r "${REPO_DIR}/tools" "${STAGING_DIR}/mcp/tools"
cp -r "${REPO_DIR}/utils" "${STAGING_DIR}/mcp/utils"
cp -r "${REPO_DIR}/setup-ui/dist" "${STAGING_DIR}/mcp/setup-ui"

# Package
rm -f "${OUTPUT}"
(cd "${STAGING_DIR}" && zip -r "${OUTPUT}" . --exclude "*/.DS_Store" -q)

# Cleanup
rm -rf "${STAGING_DIR}"

echo "✅ Built: ${OUTPUT} ($(du -sh "${OUTPUT}" | cut -f1))"
