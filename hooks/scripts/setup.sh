#!/bin/bash
# Mailbridge — session start hook
#
# The MCP server now runs via `npx -y mailbridge-mcp@latest` (see .mcp.json),
# so npm handles dependency install + native keytar build automatically, and
# @latest pulls the newest published version each session — no manual restart
# or local npm install needed here.
#
# The server itself (index.js) auto-opens the browser setup portal on first run
# when no account is configured, so this hook intentionally does nothing.
#
# Kept as a no-op for forward compatibility and so the plugin's hook wiring
# stays intact.

exit 0
