---
name: manage-accounts
description: >
  This skill should be used when the user says "add my iCloud account", "add email account",
  "switch to iCloud", "switch account", "list my accounts", "which account am I on?",
  "remove account", "set up email", "open setup portal", or wants to manage multiple email accounts.
metadata:
  version: "2.1.0"
---

Use the `mailbridge` account tools to manage accounts. Passwords are stored in
your OS credential store (macOS Keychain, Windows Credential Manager, or Linux Keyring) — never in any file.

## Opening the Setup Portal

To connect an account or add a new one, call `open_setup`. This opens a browser
form where the user fills in their email and password. Credentials go straight
to the OS credential store on submit — nothing passes through chat.

Use this when the user says:
- "connect my email", "add an account", "open setup", "reconnect my email"
- Or whenever `check_connection` returns "No email account connected"

## Adding via Chat (Fallback)

If the user prefers to add an account directly, use `add_account`. Warn them first:

> "Your password will be passed through this chat to be saved in your credential store. The setup
> portal (browser form) is more private — would you prefer that instead?"

If they proceed, collect: `name`, `email`, `password`, and `provider` (icloud/gmail/outlook/yahoo).

For iCloud, remind them:
- Go to **appleid.apple.com → Sign-In & Security → App-Specific Passwords → +**
- Name it "Mailbridge" — copy the `xxxx-xxxx-xxxx-xxxx` password
- Their main Apple ID password will NOT work

## Listing Accounts

Call `list_accounts` — show results with ✅ marking the active account.

## Switching Accounts

Call `list_accounts` first to show what's available.

If the account they want already exists, call `switch_account`. Confirm with: "Switched to [label]."

If the account doesn't exist yet, say:
> "That account isn't set up yet. Want me to open the setup so you can add it?"

If they say yes, call `open_setup`.

## No Account Connected

If any tool returns "No email account connected", respond:
> "Your email isn't connected yet. Want me to open the setup so you can connect it? It only takes a moment."

If they say yes, call `open_setup`.

## Removing Accounts

Call `remove_account` — this deletes from both the config file and the OS credential store.

- If `name` is omitted, it removes the **active** account by default.
- Removing the active account auto-switches to another account, or fully disconnects if it was the last one.
- To disconnect everything at once, call `remove_all_accounts` — this clears every account and deletes all saved passwords.

After a full disconnect, offer `open_setup` so the user can reconnect.
