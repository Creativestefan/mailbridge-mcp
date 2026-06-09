# Mailbridge MCP

Connect Claude to your email — read, search, send, reply, and organise emails from iCloud or any IMAP account.

Credentials are stored securely in your OS credential store (macOS Keychain, Windows Credential Manager, or Linux Keyring) — never in a file.

---

## Features

- **Read emails** — fetch inbox, any folder, with subject/sender/date
- **Search** — find emails by keyword, sender, or subject
- **Get email body** — retrieve full content of any message
- **Send & reply** — compose new emails or reply with threading
- **Organise** — move, delete, mark as read/unread
- **Multiple accounts** — connect and switch between accounts
- **Secure credentials** — passwords stored in OS keychain, never in plain text

---

## Install

### Via Claude Cowork (recommended)

Install the `.plugin` file from the [releases page](../../releases) directly in Claude Cowork → Settings → Plugins.

### Via npm (standalone MCP server)

```bash
npx mailbridge-mcp
```

Add to your MCP client config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mailbridge": {
      "command": "npx",
      "args": ["mailbridge-mcp"]
    }
  }
}
```

---

## Setup

Once the server is running, open the setup portal to connect your email account:

```bash
node /path/to/mailbridge-mcp/setup.js
```

This opens a browser form where you enter your email and password. Credentials go directly into your OS credential store on submit.

### iCloud

You must use an [App-Specific Password](https://account.apple.com) — your main Apple ID password will not work.

Go to **account.apple.com → Sign-In & Security → App-Specific Passwords → +**, name it "Claude Email", and use the generated password.

### Custom IMAP account

Use your full email address and password. The mail server is usually `mail.yourdomain.com` — check your email provider's settings if unsure.

---

## Tools

| Tool | Description | Permission |
|------|-------------|------------|
| `check_connection` | Test connection and show inbox stats | Auto |
| `read_emails` | Fetch emails from any folder | Auto |
| `get_email_body` | Get full body of an email by UID | Auto |
| `search_emails` | Search by keyword, sender, subject | Auto |
| `list_folders` | List all mailbox folders | Auto |
| `list_accounts` | Show all connected accounts | Auto |
| `send_email` | Compose and send a new email | Requires approval |
| `reply_to_email` | Reply to an existing email | Requires approval |
| `move_email` | Move email to another folder | Auto |
| `mark_as_read` | Mark email as read | Auto |
| `mark_as_unread` | Mark email as unread | Auto |
| `delete_email` | Move email to Trash | Requires approval |
| `switch_account` | Switch active account | Auto |
| `add_account` | Add a new account via chat | Auto |
| `remove_account` | Remove an account | Requires approval |

---

## Supported Providers

| Provider | IMAP | SMTP |
|----------|------|------|
| iCloud | `imap.mail.me.com:993` | `smtp.mail.me.com:587` |
| Custom IMAP | Your mail server | Your mail server |

---

## Security

- Passwords are stored exclusively in the OS credential store — never written to any file
- All IMAP and SMTP connections use SSL/TLS
- The setup portal is a one-time browser form — it starts, collects your credentials, saves them to your OS keychain, then shuts down automatically
- No data is sent to any Mailbridge server — everything runs locally on your device

---

## License

MIT — see [LICENSE](LICENSE)
