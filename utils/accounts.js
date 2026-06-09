/**
 * Account config — stores metadata only (host, port, user).
 * Passwords are NEVER written here — they live in the OS credential store.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { getPassword } from './keychain.js';

const CONFIG_PATH = join(homedir(), '.mailbridge-accounts.json');

export function loadConfig() {
  if (existsSync(CONFIG_PATH)) {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  }
  return { active: null, accounts: {} };
}

export function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export async function getActiveAccount() {
  const config = loadConfig();

  if (!config.active || !config.accounts[config.active]) {
    throw new Error(
      'No email account connected. Ask your assistant to open the Mailbridge setup, or run: npx mailbridge-mcp'
    );
  }

  const meta = config.accounts[config.active];

  const password = await getPassword(config.active);
  if (!password) {
    throw new Error(
      `No password found for account "${config.active}". Open Mailbridge setup to reconnect.`
    );
  }

  return {
    name: config.active,
    ...meta,
    imap: { ...meta.imap, password },
    smtp: { ...meta.smtp, password }
  };
}
