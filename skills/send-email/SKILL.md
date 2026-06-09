---
name: send-email
description: >
  This skill should be used when the user says "send an email", "email [person]",
  "write an email to", "reply to this email", "respond to UID [n]", "draft a message",
  or asks Claude to compose and send any email message.
metadata:
  version: "2.0.0"
---

Use the `mailbridge` MCP tools to compose and send emails.

## Sending a New Email

Call `send_email` with:
- `to` — recipient address
- `subject` — subject line
- `body` — plain text body
- `cc` / `bcc` — optional

**Always confirm before sending.** Show the draft first:
```
To: recipient@example.com
Subject: Your subject
---
Body of the email...
---
Send this? (yes / edit)
```

Only call `send_email` after the user confirms.

## Replying to an Email

If the user wants to reply to an existing message, use `reply_to_email` with:
- `uid` — UID of the original email
- `body` — reply text
- `folder` — folder containing the original (default: INBOX)

The tool automatically sets `Re:` prefix and threading headers.

Same confirmation step applies before sending.

## Drafting Tips

- Suggest a subject line if the user doesn't provide one
- Keep tone matching what the user describes (formal, casual, brief, detailed)
- Do not add sign-offs unless the user asks — respect their style

## No Account Connected

If any tool returns "No email account connected", respond:
> "Your email isn't connected yet. Want me to open the setup so you can connect it?"

If they say yes, call `open_setup`.
