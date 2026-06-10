#!/bin/bash
# Mailbridge — Cursor Plugin Builder
# Assembles mailbridge-cursor.zip from the source repo.
#
# Cursor reads plugins from a directory structure with .cursor-plugin/plugin.json,
# skills/ (SKILL.md files), rules/ (.mdc files), and .mcp.json.
# The MCP server is delivered via npx mailbridge-mcp@latest — no bundling needed.
#
# Output: /tmp/mailbridge-cursor.zip

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="${REPO_DIR}/plugins/mailbridge"
STAGING_DIR="$(mktemp -d)"
OUTPUT="/tmp/mailbridge-cursor.zip"

echo "🔧 Building Mailbridge Cursor plugin..."

# Plugin manifest and MCP config (Cursor uses mcp.json, not .mcp.json)
cp -r "${PLUGIN_SRC}/.cursor-plugin" "${STAGING_DIR}/.cursor-plugin"
cp "${PLUGIN_SRC}/mcp.json" "${STAGING_DIR}/mcp.json"

# Assets (logo)
cp -r "${PLUGIN_SRC}/assets" "${STAGING_DIR}/assets"

# Skills — resolve symlink to real directory
cp -rL "${REPO_DIR}/skills" "${STAGING_DIR}/skills"

# Cursor rules
cp -r "${PLUGIN_SRC}/rules" "${STAGING_DIR}/rules"

# Package
rm -f "${OUTPUT}"
(cd "${STAGING_DIR}" && zip -r "${OUTPUT}" . --exclude "*/.DS_Store" -q)

# Cleanup
rm -rf "${STAGING_DIR}"

echo "✅ Built: ${OUTPUT} ($(du -sh "${OUTPUT}" | cut -f1))"
echo "   Submit to: https://cursor.com/marketplace"
echo "   Or install locally via Cursor Settings → Tools & MCP."
