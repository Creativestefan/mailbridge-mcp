#!/usr/bin/env node
/**
 * Mailbridge — Setup Portal
 * Opens a local browser page to securely add/edit accounts.
 * Passwords go directly into the OS credential store — never into any file.
 *
 * Usage: node /path/to/plugin/mcp/setup.js
 */
import http from 'http';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir, platform } from 'os';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { ImapFlow } from 'imapflow';
import keytar from 'keytar';
import { SETUP_PORT, SETUP_URL } from './utils/setup-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CONFIG_PATH = join(homedir(), '.mailbridge-accounts.json');
// Resolve dist — works for plugin installs (mcp/setup-ui/), npm installs,
// and local source layouts (setup-ui/ next to setup.js).
const DIST_PATH = existsSync(join(__dirname, 'setup-ui', 'dist'))
  ? join(__dirname, 'setup-ui', 'dist')
  : join(__dirname, '..', 'setup-ui', 'dist');
const PORT = SETUP_PORT;

function openBrowser() {
  const url = SETUP_URL;
  const openCmd = platform() === 'win32' ? 'start' : platform() === 'darwin' ? 'open' : 'xdg-open';
  try { execSync(`${openCmd} "${url}"`); } catch { /* ignore — browser open is best-effort */ }
}

// ─── Credential store helpers (cross-platform via keytar) ───────────────────

const SERVICE = 'mailbridge';

async function savePassword(account, password) {
  await keytar.setPassword(SERVICE, account, password);
}

async function getPassword(account) {
  return await keytar.getPassword(SERVICE, account);
}

// ─── IMAP verification ──────────────────────────────────────────────────────

async function verifyImap(host, port, secure, user, password) {
  const client = new ImapFlow({
    host, port, secure,
    auth: { user, pass: password },
    logger: false,
    tls: { rejectUnauthorized: false }
  });
  await client.connect();
  await client.logout();
}

// ─── Config helpers ─────────────────────────────────────────────────────────

function loadConfig() {
  if (existsSync(CONFIG_PATH)) return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  return { active: null, accounts: {} };
}

function saveConfig(cfg) {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // Serve React SPA static assets
  if (req.method === 'GET' && (req.url === '/' || (req.url && !req.url.startsWith('/accounts') && !req.url.startsWith('/save')))) {
    const urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const filePath = join(DIST_PATH, urlPath);
    const MIME = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css',
      '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.svg':'image/svg+xml',
      '.png':'image/png', '.ico':'image/x-icon', '.json':'application/json' };
    try {
      const data = readFileSync(existsSync(filePath) ? filePath : join(DIST_PATH, 'index.html'));
      const mime = MIME[extname(existsSync(filePath) ? filePath : '.html')] || 'text/html';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('Not found');
    }

  } else if (req.method === 'GET' && req.url === '/accounts') {
    const cfg = loadConfig();
    // Strip passwords before sending to browser
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cfg));

  } else if (req.method === 'POST' && req.url === '/save') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { name, email, password, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure } = JSON.parse(body);

        // Verify credentials before saving
        try {
          await verifyImap(imap_host, imap_port, imap_secure, email, password);
        } catch (authErr) {
          const msg = String(authErr.message || '');
          const isAuth = /auth|login|credentials|invalid|password|user/i.test(msg);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: false,
            code: isAuth ? 'auth' : 'connect',
            error: isAuth
              ? 'Incorrect credentials — check your email address and password.'
              : `Could not reach mail server (${imap_host}) — check the server address and try again.`
          }));
          return;
        }

        // Save password to OS credential store
        await savePassword(name, password);

        // Save metadata (NO password) to JSON config
        const cfg = loadConfig();
        const label = `${name} (${email})`;
        cfg.accounts[name] = {
          label,
          imap: { host: imap_host, port: imap_port, secure: imap_secure, user: email },
          smtp: { host: smtp_host, port: smtp_port, secure: smtp_secure, user: email }
        };
        if (!cfg.active) cfg.active = name;
        saveConfig(cfg);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, message: `"${label}" saved to Keychain. Active account: ${cfg.active}` }));

        // Close server after short delay
        setTimeout(() => { server.close(); process.exit(0); }, 1500);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, code: 'server', error: err.message }));
      }
    });

  } else {
    res.writeHead(404); res.end();
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    // Server already running — just open the browser to the existing instance
    openBrowser();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🔐 Mailbridge — Setup Portal`);
  console.log(`   Opening: http://127.0.0.1:${PORT}`);
  console.log(`   Passwords go to your OS credential store — never written to any file.\n`);
  openBrowser();
});
