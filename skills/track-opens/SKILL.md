---
name: track-opens
description: >
  This skill should be used when the user asks "did they open my email?",
  "was my email read?", "who opened it?", "has [person] seen my email?",
  "check read receipts", "track this email", "send with a read receipt",
  or wants to know whether a sent email has been opened.
metadata:
  version: "2.6.0"
---

Use the `mailbridge` MCP read-receipt tools to track whether sent emails have been opened.

## How It Works (and its honest limits)

Mailbridge uses **read-receipt headers (RFC 8098 / MDN)**, not tracking pixels. When you send with a receipt requested, the recipient's email app may prompt them to confirm they read it. If they agree, their app emails back a machine-readable confirmation, which Mailbridge detects by scanning the inbox.

**Always set expectations clearly — never imply this is reliable like a messaging "read" tick:**
- It only works if the recipient's client supports receipts **and** they choose to send one.
- Many clients (notably **Gmail web**) ignore the request entirely.
- **No receipt does NOT mean the email was unread.** Say this explicitly whenever reporting an "awaiting" status.

## Requesting a Receipt When Sending

When the user wants to track an email, pass `request_receipt: true` to `send_email` or `reply_to_email` (see the send-email skill). Confirm with the honesty caveat above.

## Checking Opens

When the user asks whether an email was opened:
1. Call `check_email_opens` (optional `folder`, default INBOX). It scans for new confirmations, updates the local record, and returns a summary.
2. Present results plainly:
   ```
   ✅ Opened: "Subject" — by person@example.com at [time]
   … Awaiting: "Subject" — sent to person@example.com on [date]
   ```
3. For anything still awaiting, add: "No confirmation yet — but remember, that doesn't necessarily mean it hasn't been read."

To show current status **without** re-scanning the inbox, call `list_tracked_emails`.

## No Account Connected

If any tool returns "No email account connected", offer to call `open_setup`.
