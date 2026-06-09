---
name: check-email
description: >
  This skill should be used when the user asks to "read my emails", "check my inbox",
  "what's in my inbox", "summarise my emails", "show recent emails", "any new emails?",
  "read email from [person]", "find emails about [topic]", or wants to view email content.
metadata:
  version: "2.0.0"
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

## Summarising

After fetching email bodies, summarise them concisely:
- Group by sender or topic if multiple
- Highlight any action items, deadlines, or important requests
- Flag urgent items

## Workflow

1. Clarify folder if not obvious (INBOX assumed unless user says Sent, Spam, etc.)
2. Fetch emails
3. Present the list
4. Ask if they want to open any specific one, or offer to summarise all

## No Account Connected

If any tool returns "No email account connected", respond:

> "Your email isn't connected yet. Want me to open the setup so you can connect it? It only takes a moment."

If they say yes, call `open_setup`.
