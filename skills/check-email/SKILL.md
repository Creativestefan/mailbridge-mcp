---
name: check-email
description: >
  This skill should be used when the user asks to "read my emails", "check my inbox",
  "show recent emails", "any new emails?", "read email from [person]",
  "find emails about [topic]", "show full thread", "emails with [contact]",
  "contact history", "export this email", "any events in this email?", or wants to view
  a specific email or attachment. For inbox digests and catch-up summaries, use the inbox-summary skill instead.
metadata:
  version: "2.5.0"
---

Use the `mailbridge` MCP tools to fetch and present emails.

## Reading Recent Emails

Call `read_emails` with `folder` (default: INBOX) and `limit` (default: 10).

Each email now includes `priority` (1–5) and `category` fields — surface these when useful:
- Priority 5 or 4 → flag with 🔴 in the list
- Category "Finance", "Travel", "Calendar" → show the category badge

Present results as a numbered list:
```
1. 🔴 [From] Subject — Date  (priority 5)
2. [From] Subject — Date
```

If the user wants the body of a specific email, call `get_email_body` with its `uid`.
Display the body cleanly — strip excessive whitespace, preserve paragraph breaks.

## Searching Emails

If the user mentions a sender name, keyword, or subject, call `search_emails` with a `query`.
After getting UIDs back, offer to fetch the full body of any result.

## Thread View

When the user says "show the full thread", "see the whole conversation", or "what's the context":
1. Call `get_thread` with the email `uid` and `folder`
2. Present messages in chronological order:
   ```
   **Thread — [Subject]** ([N] messages)

   📩 [From] · [Date]
   [Preview...]

   📩 [From] · [Date]
   [Preview...]
   ```
3. Offer to summarise: "Want a quick summary of this thread?" — if yes, condense to 3 bullet points.

## Contact History

When the user asks "what's the history with [person]", "show emails from/to [contact]", or "have I emailed X before":
1. Call `get_contact_history` with the contact's `address`
2. Present as a timeline: Sent / Received labels, sorted oldest to newest
3. Note patterns: "You've exchanged 8 emails — 3 sent, 5 received"

## Calendar Event Extraction

When the user asks "any events in this?", "what's the date of this meeting?", or "add this to my calendar":
1. Call `extract_calendar_events` with the `uid` and `folder`
2. If events found, present them clearly:
   ```
   📅 **[Event Title]**
   Start: [date/time]
   Location: [location]
   ```
3. Offer to set a reminder via `set_reminder`

## Export Email

When the user says "export this", "save this as markdown", "give me a clean copy":
1. Call `export_email` with `uid` and `folder`
2. Return the Markdown output — the user can copy and save it

## Attachments

Always follow this flow — never skip the scan step:

**Step 1 — Scan first, always**
Call `get_attachments` with the email UID. This scans and lists attachments without downloading anything.

Present the results to the user clearly:
```
📎 This email has 2 attachment(s):

1. report.pdf — 340 KB · ✅ Safe
2. invoice.docx — 80 KB · ✅ Safe
```

If any attachment shows ⚠️ Warning or 🚫 Blocked, tell the user:
> "⚠️ **[filename]** looks suspicious — [safety_note]. I won't download this one."

Never call `read_attachment` on a blocked file.

**Step 2 — Ask for permission**
After showing the scan results, ask:
> "Would you like me to open any of these?"

Wait for the user to say yes and specify which one before calling `read_attachment`.

**Step 3 — Download and read (after user confirms)**
Call `read_attachment` with the approved `part_id`. The assistant may also show a permission prompt at this step.

- **PDF / DOCX / TXT** — display the extracted text
- **Images (JPG, PNG)** — display them inline automatically
- **Audio / Video (MP3, MP4)** — check if a transcription plugin is connected. If yes, pass the `saved_to` file path to it. If no, say: "I've saved the file locally — connect a transcription plugin and I can read it for you."

## Workflow

1. Clarify folder if not obvious (INBOX assumed unless user says Sent, Spam, etc.)
2. Fetch emails
3. Present the list
4. Ask if they want to open any specific one, read an attachment, view a thread, or get a full summary

## No Account Connected

If any tool returns "No email account connected", respond:

> "Your email isn't connected yet. Want me to open the setup so you can connect it? It only takes a moment."

If they say yes, call `open_setup`.
