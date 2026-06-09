---
name: inbox-summary
description: >
  This skill should be used when the user asks for "what did I miss?", "inbox summary",
  "catch me up", "latest email updates", "what's in my inbox", "summarise my emails",
  "anything important?", "email digest", or any request for an overview of recent emails.
metadata:
  version: "1.0.0"
---

Use `get_emails_with_preview` to fetch recent emails with body previews in one pass.
Default to `limit: 50`. Then categorise and present a structured digest.

## Categories

Scan subject lines, senders, and previews to sort emails into:

| Category | Signals |
|---|---|
| 🔴 **Action Required** | "reply needed", "urgent", "ASAP", "deadline", "waiting on you", "please confirm", "invoice due", direct questions, your name in subject |
| 💰 **Finance & Billing** | invoices, receipts, payments, subscriptions, renewals, bank alerts, "amount due", "payment received", "order confirmed" |
| 📅 **Events & Calendar** | meeting invites, RSVPs, "you're invited", travel bookings, confirmations, event reminders |
| 📦 **Updates & FYI** | newsletters, notifications, shipping updates, system alerts, social, low-priority |

## Output Format

```
## Your inbox — last [N] emails

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
- Pay or flag the invoice from [sender]
- Add [event] to your calendar
- Unsubscribe from [newsletter]
- Archive all [n] newsletters
```

## Rules

- Lead with Action Required — always show this first even if empty
- Skip categories with zero emails
- Keep each line tight — one sentence max per email
- Dates: show as "Today", "Yesterday", or "Mon 9 Jun" — never full ISO timestamps
- If preview is too short to categorise, use subject + sender alone
- After the digest, always include the "I can help you" block with 3–5 specific suggestions based on what's actually in the inbox
- If the user wants to act on anything (reply, delete, open), use the appropriate mailbridge tool
