import { z } from 'zod';
import { createImapClient } from '../utils/imap.js';
import { loadStore, saveStore } from '../utils/local-store.js';
import { randomUUID } from 'crypto';

export function registerManageTools(server) {

  // ── Single-message actions ────────────────────────────────────────────

  server.tool(
    'mark_as_read',
    'Mark an email as read',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: false, idempotentHint: true },
    async ({ uid, folder }) => {
      const client = await createImapClient();
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
      const client = await createImapClient();
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
      const client = await createImapClient();
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
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      const trashFolders = ['Trash', 'Deleted Messages', 'Deleted Items', '[Gmail]/Trash'];
      for (const trash of trashFolders) {
        try {
          await client.messageMove({ uid: true }, [String(uid)], trash);
          await client.logout();
          return { content: [{ type: 'text', text: `Email UID ${uid} moved to ${trash}` }] };
        } catch { /* try next */ }
      }

      await client.messageFlagsAdd({ uid: true }, [String(uid)], ['\\Deleted']);
      await client.mailboxClose();
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
      const client = await createImapClient();
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

  // ── NEW: Bulk actions ─────────────────────────────────────────────────

  server.tool(
    'bulk_mark_read',
    'Mark multiple emails as read in one operation',
    {
      uids: z.array(z.number()).describe('Array of email UIDs'),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: false, idempotentHint: true },
    async ({ uids, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);
      await client.messageFlagsAdd(uids, ['\\Seen'], { uid: true });
      await client.logout();
      return { content: [{ type: 'text', text: `Marked ${uids.length} email(s) as read` }] };
    }
  );

  server.tool(
    'bulk_mark_unread',
    'Mark multiple emails as unread in one operation',
    {
      uids: z.array(z.number()).describe('Array of email UIDs'),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: false, idempotentHint: true },
    async ({ uids, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);
      await client.messageFlagsRemove(uids, ['\\Seen'], { uid: true });
      await client.logout();
      return { content: [{ type: 'text', text: `Marked ${uids.length} email(s) as unread` }] };
    }
  );

  server.tool(
    'bulk_move',
    'Move multiple emails to a folder in one operation',
    {
      uids: z.array(z.number()).describe('Array of email UIDs'),
      from_folder: z.string().default('INBOX'),
      to_folder: z.string()
    },
    { destructiveHint: false },
    async ({ uids, from_folder, to_folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(from_folder);
      await client.messageMove(uids, to_folder, { uid: true });
      await client.logout();
      return { content: [{ type: 'text', text: `Moved ${uids.length} email(s) to ${to_folder}` }] };
    }
  );

  server.tool(
    'bulk_delete',
    'Move multiple emails to Trash in one operation',
    {
      uids: z.array(z.number()).describe('Array of email UIDs'),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: true },
    async ({ uids, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      const trashFolders = ['Trash', 'Deleted Messages', 'Deleted Items', '[Gmail]/Trash'];
      for (const trash of trashFolders) {
        try {
          await client.messageMove(uids, trash, { uid: true });
          await client.logout();
          return { content: [{ type: 'text', text: `Moved ${uids.length} email(s) to ${trash}` }] };
        } catch { /* try next */ }
      }

      await client.messageFlagsAdd(uids, ['\\Deleted'], { uid: true });
      await client.mailboxClose();
      await client.logout();
      return { content: [{ type: 'text', text: `Flagged ${uids.length} email(s) for deletion` }] };
    }
  );

  // ── NEW: Follow-up Reminders ──────────────────────────────────────────

  server.tool(
    'set_reminder',
    'Set a follow-up reminder on an email — it will surface in inbox summaries when due',
    {
      uid: z.number(),
      folder: z.string().default('INBOX'),
      due_date: z.string().describe('ISO 8601 date or relative description like "3 days", "tomorrow", "next Monday"'),
      note: z.string().optional().describe('What to follow up on')
    },
    { destructiveHint: false },
    async ({ uid, folder, due_date, note }) => {
      // Resolve relative dates
      let dueAt;
      const relative = due_date.match(/(\d+)\s*(day|week|hour)/i);
      if (relative) {
        const n = parseInt(relative[1]);
        const unit = relative[2].toLowerCase();
        const ms = unit === 'hour' ? n * 36e5 : unit === 'week' ? n * 6048e5 : n * 864e5;
        dueAt = new Date(Date.now() + ms).toISOString();
      } else if (/tomorrow/i.test(due_date)) {
        const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
        dueAt = d.toISOString();
      } else {
        const parsed = new Date(due_date);
        dueAt = isNaN(parsed.getTime()) ? new Date(Date.now() + 3 * 864e5).toISOString() : parsed.toISOString();
      }

      const store = loadStore('reminders');
      if (!store.reminders) store.reminders = [];

      const reminder = {
        id: randomUUID(),
        uid, folder,
        dueAt,
        note: note || null,
        createdAt: new Date().toISOString(),
        done: false
      };

      store.reminders.push(reminder);
      saveStore('reminders', store);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ok: true,
            message: `Reminder set for ${new Date(dueAt).toLocaleString()}`,
            id: reminder.id,
            dueAt
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    'list_reminders',
    'List all follow-up reminders, marking any that are overdue',
    {},
    { readOnlyHint: true },
    async () => {
      const store = loadStore('reminders');
      const reminders = (store.reminders || []).filter(r => !r.done);

      if (reminders.length === 0) {
        return { content: [{ type: 'text', text: 'No active reminders.' }] };
      }

      const now = Date.now();
      const annotated = reminders.map(r => ({
        ...r,
        overdue: new Date(r.dueAt).getTime() <= now,
        dueIn: (() => {
          const ms = new Date(r.dueAt).getTime() - now;
          if (ms < 0) return 'overdue';
          const h = Math.round(ms / 36e5);
          return h < 24 ? `in ${h}h` : `in ${Math.round(h / 24)}d`;
        })()
      }));

      return { content: [{ type: 'text', text: JSON.stringify(annotated, null, 2) }] };
    }
  );

  server.tool(
    'complete_reminder',
    'Mark a follow-up reminder as done',
    { id: z.string() },
    { destructiveHint: false },
    async ({ id }) => {
      const store = loadStore('reminders');
      const reminder = (store.reminders || []).find(r => r.id === id);
      if (!reminder) {
        return { content: [{ type: 'text', text: `No reminder found with ID: ${id}` }] };
      }
      reminder.done = true;
      saveStore('reminders', store);
      return { content: [{ type: 'text', text: `Reminder ${id} marked as done.` }] };
    }
  );

  // ── NEW: Unsubscribe ──────────────────────────────────────────────────

  server.tool(
    'unsubscribe_email',
    'Unsubscribe from a mailing list by reading the List-Unsubscribe header and performing the unsubscribe action',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: false },
    async ({ uid, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      const msg = await client.fetchOne(
        String(uid),
        { headers: ['list-unsubscribe', 'list-unsubscribe-post'] },
        { uid: true }
      );
      await client.logout();

      if (!msg) {
        return { content: [{ type: 'text', text: `No email found with UID ${uid}` }] };
      }

      const header = msg.headers?.get('list-unsubscribe') || '';
      if (!header) {
        return { content: [{ type: 'text', text: 'This email has no List-Unsubscribe header — cannot auto-unsubscribe. Try replying asking to be removed, or use the unsubscribe link in the email body.' }] };
      }

      // Parse: <https://...>, <mailto:...>
      const httpMatch = header.match(/<(https?:\/\/[^>]+)>/i);
      const mailtoMatch = header.match(/<mailto:([^>]+)>/i);
      const oneClick = (msg.headers?.get('list-unsubscribe-post') || '').includes('One-Click');

      if (httpMatch) {
        const url = httpMatch[1];
        try {
          const method = oneClick ? 'POST' : 'GET';
          const resp = await fetch(url, {
            method,
            headers: { 'User-Agent': 'Mailbridge/2.5.0' },
            ...(oneClick ? { body: 'List-Unsubscribe=One-Click', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } } : {})
          });
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                ok: resp.ok,
                method: `HTTP ${method}`,
                status: resp.status,
                url,
                message: resp.ok ? 'Unsubscribe request sent successfully.' : `Unsubscribe request returned status ${resp.status}. You may need to unsubscribe manually.`
              }, null, 2)
            }]
          };
        } catch (err) {
          return { content: [{ type: 'text', text: `Failed to reach unsubscribe URL: ${err.message}` }] };
        }
      }

      if (mailtoMatch) {
        const [mailTo, ...queryParts] = mailtoMatch[1].split('?');
        const subject = queryParts.join('?').match(/subject=([^&]+)/i)?.[1] || 'Unsubscribe';
        const { createTransporter } = await import('../utils/smtp.js');
        const { getActiveAccount } = await import('../utils/accounts.js');
        const account = await getActiveAccount();
        const transporter = await createTransporter();
        await transporter.sendMail({
          from: account.smtp.user,
          to: mailTo,
          subject: decodeURIComponent(subject),
          text: 'Please remove me from your mailing list.'
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ ok: true, method: 'mailto', to: mailTo, message: 'Unsubscribe email sent.' }, null, 2)
          }]
        };
      }

      return { content: [{ type: 'text', text: `List-Unsubscribe header found but could not parse it: ${header}` }] };
    }
  );
}
