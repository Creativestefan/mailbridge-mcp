import { z } from 'zod';
import { createImapClient } from '../utils/imap.js';

export function registerManageTools(server) {
  server.tool(
    'mark_as_read',
    'Mark an email as read',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: false, idempotentHint: true },
    async ({ uid, folder }) => {
      const client = createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);
      await client.messageFlagsAdd({ uid: true }, [String(uid)], ['\\Seen']);
      await client.logout();
      return { content: [{ type: 'text', text: `Email UID ${uid} marked as read` }] };
    }
  );

  server.tool(
    'mark_as_unread',
    'Mark an email as unread',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: false, idempotentHint: true },
    async ({ uid, folder }) => {
      const client = createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);
      await client.messageFlagsRemove({ uid: true }, [String(uid)], ['\\Seen']);
      await client.logout();
      return { content: [{ type: 'text', text: `Email UID ${uid} marked as unread` }] };
    }
  );

  server.tool(
    'move_email',
    'Move an email to another folder',
    {
      uid: z.number(),
      from_folder: z.string().default('INBOX'),
      to_folder: z.string()
    },
    { destructiveHint: false },
    async ({ uid, from_folder, to_folder }) => {
      const client = createImapClient();
      await client.connect();
      await client.mailboxOpen(from_folder);
      await client.messageMove({ uid: true }, [String(uid)], to_folder);
      await client.logout();
      return { content: [{ type: 'text', text: `Email UID ${uid} moved from ${from_folder} to ${to_folder}` }] };
    }
  );

  server.tool(
    'delete_email',
    'Move an email to Trash',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: true },
    async ({ uid, folder }) => {
      const client = createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      // Try common Trash folder names across providers
      const trashFolders = ['Trash', 'Deleted Messages', 'Deleted Items', '[Gmail]/Trash'];
      let moved = false;
      for (const trash of trashFolders) {
        try {
          await client.messageMove({ uid: true }, [String(uid)], trash);
          moved = true;
          await client.logout();
          return { content: [{ type: 'text', text: `Email UID ${uid} moved to ${trash}` }] };
        } catch {
          // try next
        }
      }

      // Fallback: flag as deleted
      if (!moved) {
        await client.messageFlagsAdd({ uid: true }, [String(uid)], ['\\Deleted']);
        await client.mailboxClose();
      }
      await client.logout();
      return { content: [{ type: 'text', text: `Email UID ${uid} flagged for deletion` }] };
    }
  );

  server.tool(
    'list_folders',
    'List all available mailbox folders',
    {},
    { readOnlyHint: true },
    async () => {
      const client = createImapClient();
      await client.connect();
      const folders = [];
      for await (const mailbox of client.list()) {
        folders.push({
          name: mailbox.name,
          path: mailbox.path,
          flags: [...(mailbox.flags || [])]
        });
      }
      await client.logout();
      return { content: [{ type: 'text', text: JSON.stringify(folders, null, 2) }] };
    }
  );
}
