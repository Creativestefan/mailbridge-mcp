# Privacy Policy

**Mailbridge** — Last updated: June 2026

## Overview

Mailbridge is a local MCP plugin that connects your AI assistant (Claude, OpenAI Codex, or any MCP-compatible client) to your email account. This policy explains what data is accessed, how it is handled, and what leaves your device.

---

## What Mailbridge accesses

Mailbridge reads from and writes to your email account using the credentials you provide during setup. This includes:

- Email messages (subject, sender, body, date)
- Folder and mailbox structure
- Email attachments (only when you explicitly request them)

---

## What stays on your device

Everything. Mailbridge runs entirely on your local machine. Specifically:

- **Your email password** is stored exclusively in your operating system's secure credential store — macOS Keychain, Windows Credential Manager, or Linux Keyring. It is never written to any file, never logged, and never transmitted to any server other than your own mail provider.
- **Email content** is fetched directly from your mail server (via IMAP/SMTP) and passed to your AI assistant within your local session. It does not pass through any Mailbridge server.
- **Attachments** are downloaded temporarily to your device only when you explicitly request them and grant permission.

---

## What leaves your device

- **Your email credentials** are sent directly to your mail provider (iCloud, or your custom IMAP/SMTP server) to authenticate your session. They go nowhere else.
- **Email content** is passed to your AI assistant as part of your conversation. Data handling is governed by the privacy policy of the AI platform you are using — [Anthropic (Claude)](https://www.anthropic.com/legal/privacy) or [OpenAI (Codex/ChatGPT)](https://openai.com/policies/privacy-policy).
- **Nothing is sent to Mailbridge servers** — there are none. The plugin has no backend, no analytics, and no telemetry.

---

## Attachment safety

Before downloading any attachment, Mailbridge performs a local safety scan:

- File extensions and MIME types are checked against a blocklist of known dangerous types (executables, scripts, etc.)
- Blocked file types are refused outright and never downloaded
- You must explicitly grant permission before any attachment is downloaded

All scanning happens locally on your device.

---

## Data retention

Mailbridge does not store email content. Once your session ends, no email data persists anywhere within Mailbridge. Your credentials remain in your OS keychain until you explicitly remove the account.

---

## Third-party services

Mailbridge connects to:

- **Your mail provider** (iCloud, or your custom IMAP/SMTP server) — to read and send email
- **Your AI assistant** — email content is shared with your AI assistant as part of your conversation. See the relevant policy: [Anthropic (Claude)](https://www.anthropic.com/legal/privacy) · [OpenAI (Codex/ChatGPT)](https://openai.com/policies/privacy-policy)

No other third-party services are used.

---

## Children's privacy

Mailbridge is not directed at children under 13. We do not knowingly collect any information from children.

---

## Changes to this policy

If this policy changes, the updated version will be committed to the [Mailbridge repository](https://github.com/Creativestefan/mailbridge-mcp) with a new date at the top.

---

## Contact

Questions about this policy? Email **stefan@windwire.studio**
