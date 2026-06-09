---
name: manage-inbox
description: >
  This skill should be used when the user wants to "organise emails", "move email to folder",
  "delete email", "mark as read", "mark as unread", "archive this", "list my folders",
  "what folders do I have?", "unsubscribe from", "bulk delete", "bulk move", "set reminder",
  "follow up on this", "remind me about this email", "add a rule", "export email",
  or perform any inbox management action.
metadata:
  version: "2.5.0"
---

Use the `mailbridge` MCP tools to organise and manage emails.

## Single-Message Actions

| Action | Tool | Key Parameters |
|--------|------|----------------|
| Mark read | `mark_as_read` | `uid`, `folder` |
| Mark unread | `mark_as_unread` | `uid`, `folder` |
| Move to folder | `move_email` | `uid`, `from_folder`, `to_folder` |
| Delete (Trash) | `delete_email` | `uid`, `folder` |
| List folders | `list_folders` | — |

## Bulk Actions

Use bulk tools when the user wants to act on multiple emails at once — they operate in a single IMAP operation (much faster than looping):

| Action | Tool | Key Parameters |
|--------|------|----------------|
| Mark multiple read | `bulk_mark_read` | `uids: []`, `folder` |
| Mark multiple unread | `bulk_mark_unread` | `uids: []`, `folder` |
| Move multiple | `bulk_move` | `uids: []`, `from_folder`, `to_folder` |
| Delete multiple | `bulk_delete` | `uids: []`, `folder` |

**Workflow for bulk:**
1. Use `search_emails` to find matching UIDs
2. Confirm: "Found [N] emails from X. [Action] all?"
3. Call the bulk tool with the full UID array — don't loop one at a time

## Follow-up Reminders

Set a reminder on an email so it surfaces in inbox summaries when due:

| Action | Tool |
|--------|------|
| Set reminder | `set_reminder` with `uid`, `folder`, `due_date`, optional `note` |
| View reminders | `list_reminders` — overdue ones are flagged |
| Mark done | `complete_reminder` with `id` |

`due_date` accepts: ISO timestamps, "tomorrow", "3 days", "next Monday", "2 weeks".

Example: "Remind me about this email in 3 days" → `set_reminder` with `due_date: "3 days"`.

## Unsubscribe

When the user says "unsubscribe from this", "stop getting emails from X", or "unsubscribe me":
1. Call `unsubscribe_email` with `uid` and `folder`
2. The tool reads the `List-Unsubscribe` header and performs the action (HTTP or email)
3. Report back: "Unsubscribed via [method]" or "No unsubscribe header — here's the manual option"

If the email has no `List-Unsubscribe` header, offer to reply asking to be removed.

## Email Rules

Rules are local filters evaluated during inbox summaries to flag, categorise, or prioritise emails:

| Action | Tool |
|--------|------|
| Add rule | `add_rule` — `name`, `condition_field`, `condition_operator`, `condition_value`, `action_type`, `action_value` |
| List rules | `list_rules` |
| Remove rule | `remove_rule` with `name` |
| Test rules | `apply_rules` with `uids` — dry run showing which emails would match |

Example rule: "Flag emails from boss@company.com as urgent"
→ `add_rule` with `condition_field: "from"`, `condition_operator: "contains"`, `condition_value: "boss@company.com"`, `action_type: "priority"`, `action_value: "5"`

## Export Email

When the user says "export this email", "save as markdown", "give me a clean version":
1. Call `export_email` with `uid` and `folder`
2. Return the clean Markdown — the user can copy, save, or share it

## General Workflow

1. If the user refers to an email by description ("the email from John"), first call `search_emails` or `read_emails` to identify the UID.
2. Confirm destructive actions (delete, bulk delete, move) before executing.
3. After acting, confirm success clearly: "Done — [N] email(s) moved to [folder]"

## Listing Folders

Call `list_folders` with no parameters. Present as a clean list grouped by type:
- System folders: INBOX, Sent, Drafts, Trash, Spam
- Custom folders: everything else

## No Account Connected

If any tool returns "No email account connected", respond:
> "Your email isn't connected yet. Want me to open the setup so you can connect it?"

If they say yes, call `open_setup`.
