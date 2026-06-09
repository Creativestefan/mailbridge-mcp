#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

import { registerStatusTools } from './tools/status.js';
import { registerReadTools } from './tools/read.js';
import { registerSendTools } from './tools/send.js';
import { registerManageTools } from './tools/manage.js';
import { registerAccountTools } from './tools/accounts.js';
import { registerAttachmentTools } from './tools/attachments.js';

// Write a PID file so the session-start hook can restart this server
// after an update, regardless of where the plugin is installed.
const PID_FILE = join(homedir(), '.mailbridge-server.pid');
try { writeFileSync(PID_FILE, String(process.pid)); } catch { /* non-fatal */ }
const cleanup = () => { try { unlinkSync(PID_FILE); } catch { /* ignore */ } };
process.on('exit', cleanup);
process.on('SIGTERM', () => { cleanup(); process.exit(0); });
process.on('SIGINT', () => { cleanup(); process.exit(0); });

const server = new McpServer({ name: 'mailbridge', version: '2.3.7' });

registerStatusTools(server);
registerReadTools(server);
registerSendTools(server);
registerManageTools(server);
registerAccountTools(server);
registerAttachmentTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
