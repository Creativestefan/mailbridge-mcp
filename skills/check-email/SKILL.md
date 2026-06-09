---
name: check-email
description: >
  This skill should be used when the user asks to "read my emails", "check my inbox",
  "show recent emails", "any new emails?", "read email from [person]",
  "find emails about [topic]", or wants to view a specific email or attachment.
  For inbox digests and catch-up summaries, use the inbox-summary skill instead.
metadata:
  version: "2.1.0"
---

Use the `mailbridge` MCP tools to fetch and present emails.

## Reading Recent Emails

Call `read_emails` with `folder` (default: INBOX) and `limit` (default: 10).

Present results as a numbered list:
```
1. [From] Subject — Date
2. [From] Subject — Date
```

If the user wants the body of a specific email, call `get_email_body` with its `uid`.
Display the body cleanly — strip excessive whitespace, preserve paragraph breaks.

## Searching Emails

If the user mentions a sender name, keyword, or subject, call `search_emails` with a `query`.
After getting UIDs back, offer to fetch the full body of any result.

## Attachments

If the user asks to open, read, or view an attachment:
1. Call `get_attachments` with the email UID to list what's available
2. Call `read_attachment` with the correct `part_id` to retrieve it
3. **PDF / DOCX / TXT** — display the extracted text
4. **Images (JPG, PNG)** — Claude displays them inline automatically
5. **Audio / Video (MP3, MP4)** — check if a transcription plugin is connected. If yes, pass the `saved_to` file path to it. If no, say: "I've saved the file locally — connect a transcription plugin and I can read it for you."

## Workflow

1. Clarify folder if not obvious (INBOX assumed unless user says Sent, Spam, etc.)
2. Fetch emails
3. Present the list
4. Ask if they want to open any specific one, read an attachment, or get a full summary

## No Account Connected

If any tool returns "No email account connected", respond:

> "Your email isn't connected yet. Want me to open the setup so you can connect it? It only takes a moment."

If they say yes, call `open_setup`.
