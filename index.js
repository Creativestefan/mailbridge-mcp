#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerStatusTools } from './tools/status.js';
import { registerReadTools } from './tools/read.js';
import { registerSendTools } from './tools/send.js';
import { registerManageTools } from './tools/manage.js';
import { registerAccountTools } from './tools/accounts.js';
import { registerAttachmentTools } from './tools/attachments.js';

const server = new McpServer({ name: 'mailbridge', version: '2.3.6' });

registerStatusTools(server);
registerReadTools(server);
registerSendTools(server);
registerManageTools(server);
registerAccountTools(server);
registerAttachmentTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
