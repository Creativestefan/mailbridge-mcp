# Mailbridge MCP

Connect your AI assistant to your email — read, search, send, reply, organise, and read attachments from iCloud or any IMAP account. Works with Claude, OpenAI Codex, Cursor, Windsurf, and any MCP-compatible client.

Credentials are stored securely in your OS credential store (macOS Keychain, Windows Credential Manager, or Linux Keyring) — never in a file.

---

## Features

- **Read emails** — fetch inbox, any folder, with subject/sender/date
- **Inbox digest** — smart summary with priorities, finance, events, and action suggestions
- **Search** — find emails by keyword, sender, or subject
- **Send & reply** — compose new emails or reply with threading
- **Organise** — move, delete, mark as read/unread
- **Read attachments** — PDF, DOCX, TXT, JPG, PNG, MP3, MP4 and more
- **Attachment safety** — every attachment is scanned before download; dangerous file types are blocked outright
- **Multiple accounts** — connect and switch between accounts
- **Secure credentials** — passwords stored in OS keychain, never in plain text

---

## Install

### Claude Cowork

1. Go to **Customize → Connectors → Browse Plugins → "+" sign **
2. Add marketplace source: `https://github.com/Creativestefan/mailbridge-mcp`
3. Install **Mailbridge** from the list
4. Start a new chat — the setup portal opens automatically if no account is connected
5. To reopen setup at any time: **"open email setup"**

**To update later:** Customize → Connectors → Browse Plugins → (...) button and Click Check for update

---

### OpenAI Codex

1. Add the Mailbridge marketplace:

```bash
codex plugin marketplace add Creativestefan/mailbridge-mcp --ref main
```

2. Install the plugin:

```bash
codex plugin add mailbridge@mailbridge
```

3. Start a new Codex thread and test:

```
Use Mailbridge to check my email connection.
```

4. If no account is connected yet:

```
Open Mailbridge setup.
```

The setup portal saves credentials directly to your OS credential store (macOS Keychain, Windows Credential Manager, or Linux Keyring).

**To update later:**

```bash
codex plugin marketplace upgrade
codex plugin add mailbridge@mailbridge
```

---

### Via npm (any MCP client)

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

On first start, if no account is configured, the setup portal opens automatically in your browser. Fill in your email details — credentials are saved directly to your OS credential store and the portal closes. You only need to do this once.

To reopen setup at any time, ask your assistant: **"open email setup"**

---

## Setup

On first install, a browser form opens automatically to connect your email account. Credentials go directly into your OS credential store on submit — nothing is written to a file.

To reopen setup at any time, just ask your assistant: **"open email setup"**.

### iCloud

You must use an [App-Specific Password](https://account.apple.com) — your main Apple ID password will not work.

Go to **account.apple.com → Sign-In & Security → App-Specific Passwords → +**, name it "Mailbridge", and use the generated password.

### Custom IMAP account

Use your full email address and password. The mail server is usually `mail.yourdomain.com` — check your email provider's settings if unsure.

---

## Tools

| Tool | Description | Permission |
|------|-------------|------------|
| `check_connection` | Test connection and show inbox stats | Auto |
| `read_emails` | Fetch emails from any folder | Auto |
| `get_email_body` | Get full body of an email by UID | Auto |
| `get_emails_with_preview` | Fetch emails with body snippets — used for inbox summaries | Auto |
| `search_emails` | Search by keyword, sender, subject | Auto |
| `list_folders` | List all mailbox folders | Auto |
| `get_attachments` | List attachments with safety scan — no download | Auto |
| `read_attachment` | Download and read an attachment after user approves | Requires approval |
| `list_accounts` | Show all connected accounts | Auto |
| `send_email` | Compose and send a new email | Requires approval |
| `reply_to_email` | Reply to an existing email | Requires approval |
| `move_email` | Move email to another folder | Auto |
| `mark_as_read` | Mark email as read | Auto |
| `mark_as_unread` | Mark email as unread | Auto |
| `delete_email` | Move email to Trash | Requires approval |
| `open_setup` | Open the setup portal to connect or add an account | Auto |
| `switch_account` | Switch active account | Auto |
| `add_account` | Add a new account via chat | Auto |
| `remove_account` | Remove an account (defaults to active) | Requires approval |
| `remove_all_accounts` | Disconnect and remove all accounts | Requires approval |

---

## Attachments

Mailbridge scans every attachment before downloading:

| Safety | Meaning |
|--------|---------|
| ✅ Safe | Known safe file type, extension matches MIME type |
| ⚠️ Warning | Unrecognised extension or MIME mismatch — will not auto-download |
| 🚫 Blocked | Executable or script file — refused outright (.exe, .bat, .ps1, .sh, .jar, etc.) |

**Supported file types:**

| Type | What happens |
|------|-------------|
| PDF | Text extracted and displayed |
| DOCX | Text extracted and displayed |
| TXT, CSV, MD | Displayed as plain text |
| JPG, PNG, GIF, WebP | Displayed inline — the AI can see and describe the image |
| MP3, MP4, WAV, M4A | Saved to temp path — pass to a transcription plugin (e.g. ElevenLabs, Whisper) |

---

## Inbox Summary

Ask your assistant **"catch me up"** or **"what did I miss?"** for a structured digest:

- 🔴 **Action Required** — emails that need a reply or decision
- 💰 **Finance & Billing** — invoices, payments, subscription renewals
- 📅 **Events & Calendar** — meeting invites, travel confirmations, RSVPs
- 📦 **Updates & FYI** — newsletters, notifications, low-priority

Followed by a **suggested actions** block with specific next steps based on what's in your inbox.

---

## Supported Providers

| Provider | IMAP | SMTP |
|----------|------|------|
| iCloud | `imap.mail.me.com:993` | `smtp.mail.me.com:587` |
| Custom IMAP | Your mail server | Your mail server |

---

## Security

- Passwords are stored exclusively in the OS credential store — never written to any file
- The setup portal is a one-time browser form — it starts, collects your credentials, saves them to your OS keychain, then shuts down automatically
- All IMAP and SMTP connections use SSL/TLS
- Attachments are scanned before download — executables and scripts are always blocked
- No data is sent to any Mailbridge server — everything runs locally on your device

---

## License

MIT — see [LICENSE](LICENSE)

---

## Legal

- [Privacy Policy](PRIVACY.md)
- [Terms of Use](TERMS.md)
