---
name: email-status
description: >
  This skill should be used when the user asks "is email connected?", "email status",
  "check my email connection", "is my inbox working?", "what account is connected?",
  or any question about whether the email integration is working or what account is active.
metadata:
  version: "2.0.0"
---

Call the `check_connection` tool from the `mailbridge` MCP server.

Present the result as a clean status card:

**If connected:**
- Show a green ✅ indicator
- Display the connected account (email address)
- Display the mail host
- Show inbox summary: total messages and unread count
- Example: "✅ Connected — hello@example.com (mail.example.com) · 142 messages, 3 unread"

**If not connected — no account configured:**
- Respond: "Your email isn't connected yet. Want me to open the setup so you can connect it? It only takes a moment."
- If they say yes, call `open_setup`

**If not connected — auth or server error:**
- Show a red ❌ indicator
- Display the error clearly
- Offer: "Want me to open the setup portal so you can update your credentials?"
- If they say yes, call `open_setup`

Keep the response concise — one line summary, then bullet details if needed.
