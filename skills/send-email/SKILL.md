---
name: send-email
description: >
  This skill should be used when the user says "send an email", "email [person]",
  "write an email to", "reply to this email", "respond to UID [n]", "draft a message",
  or asks me to compose and send any email message.
  For saving drafts or scheduling, use the draft-email skill.
metadata:
  version: "2.6.0"
---

Use the `mailbridge` MCP tools to compose and send emails.

## Sending a New Email

Call `send_email` with:
- `to` — recipient address
- `subject` — subject line
- `body` — plain text body
- `cc` / `bcc` — optional
- `request_receipt` — set `true` if the user wants to know when the email is opened (see Read Receipts below)

**Always confirm before sending.** Show the draft first:
```
To: recipient@example.com
Subject: Your subject
---
Body of the email...
---
Send this? (yes / edit / save as draft)
```

- If the user says **yes/send** → call `send_email`
- If the user says **save as draft** → use the draft-email skill: call `save_draft`
- If the user says **schedule** → use the draft-email skill: call `schedule_email`

## Replying to an Email

If the user wants to reply to an existing message, use `reply_to_email` with:
- `uid` — UID of the original email
- `body` — reply text
- `folder` — folder containing the original (default: INBOX)

The tool automatically sets `Re:` prefix and threading headers.

Same confirmation step applies before sending.

`reply_to_email` also accepts `request_receipt` — same behaviour as `send_email`.

## Read Receipts

If the user asks to "track this", "know when they open it", or "request a read receipt", set `request_receipt: true` on `send_email` or `reply_to_email`. Then, to check status later, use the **track-opens** skill (`check_email_opens`).

**Be honest about how this works** — do not over-promise:
> "I've requested a read receipt. Note this only works if the recipient's email app supports receipts and they agree to send one — Gmail's web app, for example, ignores it. So if no confirmation comes back, it doesn't mean they didn't read it."

## Drafting Tips

- Suggest a subject line if the user doesn't provide one
- Keep tone matching what the user describes (formal, casual, brief, detailed)
- Do not add sign-offs unless the user asks — respect their style

## No Account Connected

If any tool returns "No email account connected", respond:
> "Your email isn't connected yet. Want me to open the setup so you can connect it?"

If they say yes, call `open_setup`.
