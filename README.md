# Mailbridge MCP

Connect your AI assistant to your email — read, search, send, reply, organise, draft, schedule, and manage attachments from iCloud or any IMAP account. Works with Claude, OpenAI Codex, Cursor, Windsurf, and any MCP-compatible client.

Credentials are stored securely in your OS credential store (macOS Keychain, Windows Credential Manager, or Linux Keyring) — never in a file.

---

## Features

### Reading & Search
- **Read emails** — fetch inbox, any folder, with subject/sender/date
- **Inbox digest** — smart summary with priority scoring, categories, and action suggestions
- **Search** — find emails by keyword, sender, or subject
- **Thread view** — see the full conversation thread for any email
- **Contact history** — view all emails to/from a specific contact
- **Unified inbox** — merge multiple folders into one date-sorted view
- **Priority scoring** — every email is automatically scored 1–5 for urgency
- **Auto-categorisation** — emails are tagged Finance, Travel, Calendar, Newsletter, and more

### Sending & Drafts
- **Send & reply** — compose new emails or reply with threading
- **Smart drafts** — save emails locally for review before sending
- **Email scheduling** — schedule emails to send at a future time
- **Read receipts** — optionally request confirmation when a sent email is opened (recipient-dependent; see [Read Receipts](#read-receipts))

### Organisation
- **Bulk actions** — mark, move, or delete multiple emails in one command
- **Follow-up reminders** — tag an email "remind me in 3 days" and it surfaces in your next digest
- **Unsubscribe** — auto-unsubscribe from mailing lists via List-Unsubscribe headers
- **Email rules** — define local rules to flag, categorise, or prioritise emails automatically
- **Move, delete, mark** — standard inbox management tools

### Attachments & Content
- **Read attachments** — PDF, DOCX, TXT, JPG, PNG, MP3, MP4 and more
- **Attachment safety** — every attachment is scanned before download; dangerous file types are blocked
- **Export email** — export any email as clean Markdown
- **Calendar extraction** — pull event details (dates, times, locations) from emails and .ics files

### Accounts
- **Multiple accounts** — connect and switch between accounts
- **Secure credentials** — passwords stored in OS keychain, never in plain text

---

## Install

### Claude Cowork

1. Go to **Customize → Connectors → Browse Plugins → "+" sign**
2. Add marketplace source: `https://github.com/Creativestefan/mailbridge-mcp`
3. Start a new chat — and enter `Open Mailbridge setup` to open the setup portal and connect your email account
4. For **iCloud emails** you will need to create an [App specfic password](https://appleid.apple.com/) to access your email securely. Using your real password will fail to authenicate. 
5. To reopen setup at any time: **"open Mailbridge setup"**

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
Type "Open Mailbridge setup" and send.
```

The setup portal saves credentials directly to your OS credential store (macOS Keychain, Windows Credential Manager, or Linux Keyring).

**To update later:**

```bash
codex plugin marketplace upgrade
codex plugin add mailbridge@mailbridge
```

---

### Cursor

1. Open **Cursor Settings → Tools & MCP**
2. Click **Add MCP Server** and paste:

```json
{
  "mcpServers": {
    "mailbridge": {
      "command": "npx",
      "args": ["-y", "mailbridge-mcp@latest"]
    }
  }
}
```

3. Fully quit and reopen Cursor (MCP servers only load at startup)
4. Start a new chat and test:

```
Use Mailbridge to check my email connection.
```

If no account is connected yet, the setup portal opens automatically — or ask: **"open email setup"**.

**To update later:** bump the version tag in your config to `mailbridge-mcp@latest` — it always pulls the newest release.

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

### Reading

| Tool | Description |
|------|-------------|
| `check_connection` | Test connection and show inbox stats |
| `read_emails` | Fetch emails from any folder (includes priority + category) |
| `get_email_body` | Get full body of an email by UID |
| `get_emails_with_preview` | Fetch emails with body snippets — used for inbox summaries |
| `search_emails` | Search by keyword, sender, or subject |
| `list_folders` | List all mailbox folders |
| `get_thread` | Fetch the full conversation thread for an email |
| `get_contact_history` | All emails to/from a specific contact |
| `unified_inbox` | Merge multiple folders into one sorted view |
| `export_email` | Export an email as clean Markdown |
| `extract_calendar_events` | Extract event details and parse .ics attachments |

### Attachments

| Tool | Description |
|------|-------------|
| `get_attachments` | List attachments with safety scan — no download |
| `read_attachment` | Download and read an attachment after user approves |

### Sending & Drafts

| Tool | Description |
|------|-------------|
| `send_email` | Compose and send a new email |
| `reply_to_email` | Reply to an existing email |
| `save_draft` | Save an email as a local draft |
| `list_drafts` | List saved drafts |
| `send_draft` | Send a saved draft by ID |
| `delete_draft` | Discard a saved draft |
| `schedule_email` | Schedule an email for future delivery |
| `list_scheduled` | List pending scheduled emails |
| `cancel_scheduled` | Cancel a scheduled email |
| `check_email_opens` | Scan the inbox for read-receipt confirmations and report opens |
| `list_tracked_emails` | Show tracked emails and their open status (no inbox scan) |

### Organisation

| Tool | Description |
|------|-------------|
| `mark_as_read` | Mark email as read |
| `mark_as_unread` | Mark email as unread |
| `move_email` | Move email to another folder |
| `delete_email` | Move email to Trash |
| `bulk_mark_read` | Mark multiple emails as read |
| `bulk_mark_unread` | Mark multiple emails as unread |
| `bulk_move` | Move multiple emails to a folder |
| `bulk_delete` | Move multiple emails to Trash |
| `set_reminder` | Set a follow-up reminder on an email |
| `list_reminders` | View active reminders (overdue ones flagged) |
| `complete_reminder` | Mark a reminder as done |
| `unsubscribe_email` | Auto-unsubscribe via List-Unsubscribe header |

### Rules

| Tool | Description |
|------|-------------|
| `add_rule` | Add a local rule to flag, categorise, or prioritise emails |
| `list_rules` | List all configured rules |
| `remove_rule` | Remove a rule by name |
| `apply_rules` | Dry-run rules against a set of emails |

### Accounts

| Tool | Description |
|------|-------------|
| `list_accounts` | Show all connected accounts |
| `switch_account` | Switch active account |
| `add_account` | Add a new account via chat |
| `remove_account` | Remove an account (defaults to active) |
| `remove_all_accounts` | Disconnect and remove all accounts |
| `open_setup` | Open the setup portal to connect or add an account |

---

## Inbox Summary

Ask your assistant **"catch me up"** or **"what did I miss?"** for a structured digest.

Every email now carries automatic **priority scoring** (1–5) and **category tags** so the digest is sorted instantly:

- 🔴 **Action Required** — priority 4–5 or keywords like "urgent", "deadline", "reply needed"
- 💰 **Finance & Billing** — invoices, payments, subscription renewals
- 📅 **Events & Calendar** — meeting invites, travel confirmations, RSVPs
- 📦 **Updates & FYI** — newsletters, notifications, low-priority

**Follow-up reminders** due today or overdue are surfaced at the top of every digest.

The digest closes with a **suggested actions** block — specific next steps like "unsubscribe from X", "set a reminder on Y", or "bulk archive the 8 newsletters".

---

## Drafts & Scheduling

Save any email as a draft before sending:
> "Draft a reply to this email — I'll review it first"

Schedule an email for later:
> "Send this to john@example.com tomorrow at 9am"

Scheduled emails fire automatically on the next session start after the scheduled time.

---

## Read Receipts

Ask Mailbridge to track when a sent email is opened:

> "Send this to john@example.com and let me know when he opens it"

This sets `request_receipt: true`, which adds standard **read-receipt headers (RFC 8098 / MDN)** to the message. Later:

> "Did John open my email?"

runs `check_email_opens`, which scans your inbox for the recipient's confirmation and reports who opened it and when.

**How it actually works — and its limits:**

- Mailbridge uses **read-receipt headers, not tracking pixels**. Nothing phones home to any server; the recipient's mail app asks *them* to confirm, and the confirmation comes back as a normal email that Mailbridge reads locally.
- A receipt only arrives if the recipient's client **supports** read receipts **and** the recipient **agrees** to send one. Apple Mail and Thunderbird prompt for this; **Gmail's web app ignores it**.
- **No receipt does not mean the email was unread.** An "awaiting" status simply means no confirmation has come back — it is not proof of anything.
- This is intentionally the privacy-respecting approach: no invisible pixels, no third-party trackers, no data leaving your device.

---

## Email Rules

Define local rules that apply automatically during inbox summaries:

> "Flag all emails from boss@company.com as urgent"
> "Categorise anything from billing@stripe.com as Finance"
> "Set priority 5 on emails with 'invoice due' in the subject"

Rules are stored locally — they work without any server-side filtering.

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
| MP3, MP4, WAV, M4A | Saved to temp path — pass to a transcription plugin |

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
