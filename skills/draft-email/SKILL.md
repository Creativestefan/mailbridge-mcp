---
name: draft-email
description: >
  This skill should be used when the user says "save as draft", "draft an email", "save this for later",
  "schedule an email", "send this tomorrow", "send at [time]", "show my drafts", "list drafts",
  "send draft", "delete draft", or wants to review an email before sending.
  Also use for scheduled emails: "schedule email for Monday", "send this at 9am".
metadata:
  version: "1.0.0"
---

Use the `mailbridge` MCP tools to save, review, and send drafts — and schedule emails for future delivery.

## Draft Workflow

When the user wants to compose but isn't ready to send immediately:

1. Compose the email content (to, subject, body)
2. Call `save_draft` with the email details — returns a draft `id`
3. Show the draft summary:
   ```
   ✉️ Draft saved
   To: recipient@example.com
   Subject: Your subject
   ---
   Body preview...
   ---
   Say "send draft" to send it, or "delete draft" to discard.
   ```
4. When user says "send it" / "send draft" / confirms → call `send_draft` with the `id`
5. When user says "discard" / "cancel" / "delete" → call `delete_draft` with the `id`

## Listing Drafts

Call `list_drafts` — show as numbered list with draft id, recipient, subject, and saved time.
When the user picks one to send or delete, use the `id`.

## Scheduled Emails

When the user wants to send at a specific future time:

1. Collect: `to`, `subject`, `body`, `send_at` (ISO timestamp)
2. Resolve relative times: "tomorrow at 9am" → compute the ISO timestamp before calling the tool
3. Call `schedule_email`
4. Confirm: "✅ Scheduled for [time]. It'll send automatically next time your session starts after that time."

> **Note:** Scheduled emails send on the next session start after the scheduled time — not at the exact second. Let the user know if they ask about precision.

To cancel a scheduled email: call `list_scheduled` to find the `id`, then `cancel_scheduled`.

## Always Confirm Before Sending

Whether sending immediately or a draft, always show a confirmation step:
```
To: ...
Subject: ...
---
Body...
---
Send this? (yes / edit)
```

Only call `send_email` or `send_draft` after the user confirms.
