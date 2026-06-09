---
name: inbox-summary
description: >
  This skill should be used when the user asks for "what did I miss?", "inbox summary",
  "catch me up", "latest email updates", "what's in my inbox", "summarise my emails",
  "anything important?", "email digest", or any request for an overview of recent emails.
metadata:
  version: "2.5.0"
---

Use `get_emails_with_preview` to fetch recent emails with body previews in one pass.
Default to `limit: 50`. Each email in the response now includes `priority` (1–5) and `category` fields — use these directly rather than re-classifying manually.

## Pre-Summary: Check Reminders

Before presenting the digest, call `list_reminders`. If any reminders are overdue or due today, surface them first:

```
⏰ **Follow-up reminders due**
- UID 123 (INBOX) — [note] · overdue
- UID 88 (INBOX) — [note] · due today
```

Skip this block if `list_reminders` returns no active reminders.

## Categories

Map the `category` field from the tool response to digest sections:

| Tool category | Digest section |
|---|---|
| `ActionRequired` | 🔴 Action Required |
| `Finance` | 💰 Finance & Billing |
| `Travel` or `Calendar` | 📅 Events & Calendar |
| `Newsletter`, `Social`, `Updates` | 📦 Updates & FYI |

Use the `priority` field to sort within sections — highest priority first.
Emails with `priority ≥ 4` always appear in Action Required regardless of category.

If your local rules (from `list_rules`) add overrides, apply them: a rule with `action_type: "priority"` bumps the score; `action_type: "category"` overrides the section; `action_type: "flag"` adds a tag next to the sender name.

## Output Format

```
## Your inbox — last [N] emails

⏰ **Follow-up reminders due** (if any)
- UID [x] — [note] · overdue

### 🔴 Action Required ([n])
- **[Sender]** — [Subject] · [Date]
  [One line on what action is needed]

### 💰 Finance & Billing ([n])
- **[Sender]** — [Subject] · [Date]
  [Amount or key detail if visible in preview]

### 📅 Events & Calendar ([n])
- **[Sender]** — [Subject] · [Date]
  [Date/time of event if visible]

### 📦 Updates & FYI ([n])
- **[Sender]** — [Subject] · [Date]

---
### 💡 I can help you
- Reply to [sender] about [topic]
- Unsubscribe from [newsletter] (say "unsubscribe from UID [x]")
- Set a reminder on [email] for follow-up
- Bulk archive the [n] newsletter emails
- Extract the event details from [email]
```

## Rules

- Lead with Action Required — always show this first, even if empty
- Skip categories with zero emails
- Keep each line tight — one sentence max per email
- Dates: show as "Today", "Yesterday", or "Mon 9 Jun" — never full ISO timestamps
- If preview is too short to classify, use subject + sender alone
- After the digest, always include the "I can help you" block with 3–5 specific, actionable suggestions based on what's actually in the inbox — mention unsubscribe, reminder, bulk actions when relevant
- If the user wants to act on anything (reply, delete, open), use the appropriate mailbridge tool
