import { z } from 'zod';
import { loadConfig, saveConfig } from '../utils/accounts.js';
import { savePassword, deletePassword } from '../utils/keychain.js';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROVIDER_PRESETS = {
  icloud: {
    imap: { host: 'imap.mail.me.com', port: 993, secure: true },
    smtp: { host: 'smtp.mail.me.com', port: 587, secure: false }
  },
  cpanel: {
    imap: { host: '', port: 993, secure: true },
    smtp: { host: '', port: 465, secure: true }
  }
};

export function registerAccountTools(server) {
  server.tool(
    'list_accounts',
    'List all configured email accounts and show which one is currently active',
    {},
    { readOnlyHint: true },
    async () => {
      const config = loadConfig();
      const accounts = Object.entries(config.accounts).map(([name, acc]) => ({
        name,
        label: acc.label,
        active: name === config.active,
        host: acc.imap.host
      }));
      return { content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }] };
    }
  );

  server.tool(
    'switch_account',
    'Switch the active email account',
    { name: z.string() },
    { destructiveHint: false },
    async ({ name }) => {
      const config = loadConfig();
      if (!config.accounts[name]) {
        const available = Object.keys(config.accounts).join(', ');
        return { content: [{ type: 'text', text: `Account "${name}" not found. Available: ${available}` }] };
      }
      config.active = name;
      saveConfig(config);
      const acc = config.accounts[name];
      return { content: [{ type: 'text', text: `Switched to ${acc.label} (${acc.imap.host})` }] };
    }
  );

  server.tool(
    'add_account',
    'Add a new email account. Use provider="icloud", "gmail", "outlook", or "yahoo" to auto-fill server settings — only email and password are then required.',
    {
      name: z.string().describe('Short identifier, e.g. "icloud" or "work"'),
      label: z.string().describe('Display name, e.g. "iCloud (you@icloud.com)"'),
      email: z.string().describe('Email address'),
      password: z.string().describe('Password or App-Specific Password'),
      provider: z.string().optional().describe('icloud | gmail | outlook | yahoo — auto-fills server settings'),
      imap_host: z.string().optional(),
      imap_port: z.number().optional(),
      imap_secure: z.boolean().optional(),
      smtp_host: z.string().optional(),
      smtp_port: z.number().optional(),
      smtp_secure: z.boolean().optional()
    },
    { destructiveHint: false },
    async ({ name, label, email, password, provider, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure }) => {
      const preset = provider ? PROVIDER_PRESETS[provider.toLowerCase()] : null;
      const imapHost = imap_host ?? preset?.imap.host ?? '';

      if (!imapHost) {
        return { content: [{ type: 'text', text: 'Missing imap_host — either provide it or set provider= (icloud/gmail/outlook/yahoo)' }] };
      }

      // Save password to OS credential store — NOT in the JSON file
      await savePassword(name, password);

      // Store metadata only (no password)
      const account = {
        label: label ?? `${name} (${email})`,
        imap: { host: imapHost, port: imap_port ?? preset?.imap.port ?? 993, secure: imap_secure ?? preset?.imap.secure ?? true, user: email },
        smtp: { host: smtp_host ?? preset?.smtp.host ?? '', port: smtp_port ?? preset?.smtp.port ?? 587, secure: smtp_secure ?? preset?.smtp.secure ?? false, user: email }
      };

      const config = loadConfig();
      config.accounts[name] = account;
      saveConfig(config);

      return { content: [{ type: 'text', text: `Account "${name}" added — password saved to system credential store. Use switch_account to activate it.` }] };
    }
  );

  server.tool(
    'remove_account',
    'Remove a configured email account and delete its password from Keychain',
    { name: z.string() },
    { destructiveHint: true },
    async ({ name }) => {
      const config = loadConfig();
      if (!config.accounts[name]) {
        return { content: [{ type: 'text', text: `Account "${name}" not found` }] };
      }
      if (config.active === name) {
        return { content: [{ type: 'text', text: `Cannot remove the active account. Switch to another account first.` }] };
      }
      delete config.accounts[name];
      saveConfig(config);
      await deletePassword(name);
      return { content: [{ type: 'text', text: `Account "${name}" removed from config and credential store` }] };
    }
  );

  server.tool(
    'open_setup',
    'Open the Mailbridge setup portal in the browser to connect or add an email account',
    {},
    { destructiveHint: false },
    async () => {
      const setupPath = join(__dirname, '..', 'setup.js');
      spawn('node', [setupPath], {
        detached: true,
        stdio: 'ignore',
        cwd: join(__dirname, '..')
      }).unref();
      return { content: [{ type: 'text', text: 'Opening Mailbridge setup portal in your browser. Fill in your email details and click Connect.' }] };
    }
  );
}
