#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

import { registerStatusTools } from './tools/status.js';
import { registerReadTools } from './tools/read.js';
import { registerSendTools } from './tools/send.js';
import { registerManageTools } from './tools/manage.js';
import { registerAccountTools } from './tools/accounts.js';
import { registerAttachmentTools } from './tools/attachments.js';
import { registerDraftTools, checkAndSendScheduled } from './tools/drafts.js';
import { registerRuleTools } from './tools/rules.js';
import { registerReceiptTools } from './tools/receipts.js';

// Keep the connector alive. A transient IMAP/socket error (e.g. iCloud dropping
// an idle connection, which emits an unhandled 'error' event) must NEVER crash
// the whole MCP server — if the process dies, the host tears down and restarts
// the connection, which the user sees as the connector "flapping" between
// connected and reconnecting. Log to stderr (never stdout — that carries the
// JSON-RPC protocol) and keep running.
process.on('uncaughtException', (err) => {
  try { console.error('[mailbridge] uncaughtException:', err?.stack || err); } catch { /* ignore */ }
});
process.on('unhandledRejection', (err) => {
  try { console.error('[mailbridge] unhandledRejection:', err?.stack || err); } catch { /* ignore */ }
});

// Write a PID file so the session-start hook can restart this server
// after an update, regardless of where the plugin is installed.
const PID_FILE = join(homedir(), '.mailbridge-server.pid');
try { writeFileSync(PID_FILE, String(process.pid)); } catch { /* non-fatal */ }
const cleanup = () => { try { unlinkSync(PID_FILE); } catch { /* ignore */ } };
process.on('exit', cleanup);
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('SIGINT', () => { cleanup(); process.exit(0); });

const server = new McpServer({ name: 'mailbridge', version: '2.6.1' });

registerStatusTools(server);
registerReadTools(server);
registerSendTools(server);
registerManageTools(server);
registerAccountTools(server);
registerAttachmentTools(server);
registerDraftTools(server);
registerRuleTools(server);
registerReceiptTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

// Fire scheduled emails that are due — runs silently in the background.
// Note: scheduled emails only send when a session is active (no persistent daemon).
try { await checkAndSendScheduled(); } catch { /* non-fatal */ }

// Auto-open setup portal on first run if no account is configured.
// Works for any MCP client (Cowork handles this via its SessionStart hook,
// but standalone npx/npm users get the same experience here).
const CONFIG_FILE = join(homedir(), '.mailbridge-accounts.json');
const noConfig = !existsSync(CONFIG_FILE);
const noAccount = !noConfig && (() => {
  try { return !JSON.parse(readFileSync(CONFIG_FILE, 'utf8')).active; } catch { return true; }
})();

if (noConfig || noAccount) {
  const setupPath = join(__dirname, 'setup.js');
  if (existsSync(setupPath)) {
    spawn('node', [setupPath], { detached: true, stdio: 'ignore', cwd: __dirname }).unref();
  }
}
