---
name: manage-inbox
description: >
  This skill should be used when the user wants to "organise emails", "move email to folder",
  "delete email", "mark as read", "mark as unread", "archive this", "list my folders",
  "what folders do I have?", or perform any inbox management action.
metadata:
  version: "2.0.0"
---

Use the `mailbridge` MCP tools to organise and manage emails.

## Available Actions

| Action | Tool | Key Parameters |
|--------|------|----------------|
| Mark read | `mark_as_read` | `uid`, `folder` |
| Mark unread | `mark_as_unread` | `uid`, `folder` |
| Move to folder | `move_email` | `uid`, `from_folder`, `to_folder` |
| Delete (Trash) | `delete_email` | `uid`, `folder` |
| List folders | `list_folders` | — |

## Workflow

1. If the user refers to an email by description ("the email from John"), first call `search_emails` or `read_emails` to identify the UID.
2. Confirm destructive actions (delete, move) before executing.
3. After acting, confirm success: "Done — email moved to [folder]" or "Deleted."

## Listing Folders

Call `list_folders` with no parameters. Present as a clean list grouped by type:
- System folders: INBOX, Sent, Drafts, Trash, Spam
- Custom folders: everything else

Useful when the user wants to know where to move something.

## Bulk Actions

If the user wants to act on multiple emails (e.g. "mark all read", "delete all from X"):
1. Use `search_emails` to find all matching UIDs
2. Confirm: "Found 12 emails from X. Delete all?"
3. Loop through UIDs and call the action tool for each

## No Account Connected

If any tool returns "No email account connected", respond:
> "Your email isn't connected yet. Want me to open the setup so you can connect it?"

If they say yes, call `open_setup`.
