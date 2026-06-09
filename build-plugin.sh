#!/bin/bash
# Mailbridge — Plugin Builder
# Assembles mailbridge.plugin from the source repo.
#
# The MCP server is delivered via npm: .mcp.json runs `npx -y mailbridge-mcp@latest`,
# which fetches the package and rebuilds the native keytar binding for whatever
# platform installs the plugin. So the plugin itself only needs to carry the
# Claude-specific pieces (manifest, hooks, skills) — NOT the server source or
# node_modules. This keeps the plugin tiny and cross-platform.
#
# Output: /tmp/mailbridge.plugin

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGING_DIR="$(mktemp -d)"
OUTPUT="/tmp/mailbridge.plugin"

echo "🔧 Building Mailbridge plugin..."

# Plugin payload — manifest, MCP config (npx), hooks, skills
cp "${REPO_DIR}/.mcp.json" "${STAGING_DIR}/.mcp.json"
cp -r "${REPO_DIR}/.claude-plugin" "${STAGING_DIR}/.claude-plugin"
cp -r "${REPO_DIR}/hooks" "${STAGING_DIR}/hooks"
cp -RL "${REPO_DIR}/skills" "${STAGING_DIR}/skills"

# Package
rm -f "${OUTPUT}"
(cd "${STAGING_DIR}" && zip -r "${OUTPUT}" . --exclude "*/.DS_Store" -q)

# Cleanup
rm -rf "${STAGING_DIR}"

echo "✅ Built: ${OUTPUT} ($(du -sh "${OUTPUT}" | cut -f1))"
echo "   Server delivered via npx mailbridge-mcp@latest (no node_modules bundled)."
