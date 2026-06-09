/**
 * drafts.js — Local email drafts and scheduled sending
 * Drafts live in ~/.mailbridge-drafts.json
 * Scheduled emails live in ~/.mailbridge-scheduled.json
 * Passwords NEVER stored here — SMTP credentials come from OS keychain at send time.
 */
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { loadStore, saveStore } from '../utils/local-store.js';
import { createTransporter } from '../utils/smtp.js';
import { getActiveAccount } from '../utils/accounts.js';

// ─── Scheduled send (called on server startup) ──────────────────────────────

export async function checkAndSendScheduled() {
  const store = loadStore('scheduled');
  const pending = store.scheduled || [];
  if (pending.length === 0) return;

  const now = Date.now();
  const remaining = [];
  let sent = 0;

  for (const item of pending) {
    if (new Date(item.sendAt).getTime() <= now) {
      try {
        const transporter = await createTransporter();
        const account = await getActiveAccount();
        await transporter.sendMail({
          from: account.smtp.user,
          to: item.to,
          cc: item.cc,
          bcc: item.bcc,
          subject: item.subject,
          text: item.body
        });
        sent++;
      } catch {
        // Keep in queue if send fails — will retry next session
        remaining.push(item);
      }
    } else {
      remaining.push(item);
    }
  }

  if (sent > 0) {
    store.scheduled = remaining;
    saveStore('scheduled', store);
  }
}

// ─── Tool registration ───────────────────────────────────────────────────────

export function registerDraftTools(server) {

  // ── Drafts ──────────────────────────────────────────────────────────────

  server.tool(
    'save_draft',
    'Save an email as a local draft for review before sending',
    {
      to: z.string(),
      subject: z.string(),
      body: z.string(),
      cc: z.string().optional(),
      bcc: z.string().optional(),
      reply_to_uid: z.number().optional(),
      reply_to_folder: z.string().optional(),
      name: z.string().optional().describe('Optional label for the draft')
    },
    { readOnlyHint: false, idempotentHint: false },
    async ({ to, subject, body, cc, bcc, reply_to_uid, reply_to_folder, name }) => {
      const store = loadStore('drafts');
      if (!store.drafts) store.drafts = [];

      const draft = {
        id: randomUUID(),
        name: name || subject,
        to, subject, body,
        cc: cc || null,
        bcc: bcc || null,
        replyToUid: reply_to_uid || null,
        replyToFolder: reply_to_folder || null,
        savedAt: new Date().toISOString()
      };

      store.drafts.push(draft);
      saveStore('drafts', store);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ok: true,
            message: `Draft saved — ID: ${draft.id}`,
            draft: { id: draft.id, to, subject, savedAt: draft.savedAt }
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    'list_drafts',
    'List all saved local drafts',
    {},
    { readOnlyHint: true },
    async () => {
      const store = loadStore('drafts');
      const drafts = (store.drafts || []).map(d => ({
        id: d.id,
        name: d.name,
        to: d.to,
        subject: d.subject,
        savedAt: d.savedAt,
        isReply: !!d.replyToUid
      }));
      return {
        content: [{
          type: 'text',
          text: drafts.length === 0
            ? 'No saved drafts.'
            : JSON.stringify(drafts, null, 2)
        }]
      };
    }
  );

  server.tool(
    'send_draft',
    'Send a saved draft by its ID, then delete it from the draft store',
    { id: z.string() },
    { destructiveHint: true },
    async ({ id }) => {
      const store = loadStore('drafts');
      const drafts = store.drafts || [];
      const idx = drafts.findIndex(d => d.id === id);

      if (idx === -1) {
        return { content: [{ type: 'text', text: `No draft found with ID: ${id}` }] };
      }

      const draft = drafts[idx];
      const account = await getActiveAccount();
      const transporter = await createTransporter();

      await transporter.sendMail({
        from: account.smtp.user,
        to: draft.to,
        cc: draft.cc || undefined,
        bcc: draft.bcc || undefined,
        subject: draft.subject,
        text: draft.body
      });

      // Remove sent draft
      store.drafts = drafts.filter(d => d.id !== id);
      saveStore('drafts', store);

      return {
        content: [{
          type: 'text',
          text: `✅ Draft sent to ${draft.to} — subject: "${draft.subject}"`
        }]
      };
    }
  );

  server.tool(
    'delete_draft',
    'Discard a saved draft by its ID',
    { id: z.string() },
    { destructiveHint: true },
    async ({ id }) => {
      const store = loadStore('drafts');
      const before = (store.drafts || []).length;
      store.drafts = (store.drafts || []).filter(d => d.id !== id);

      if (store.drafts.length === before) {
        return { content: [{ type: 'text', text: `No draft found with ID: ${id}` }] };
      }

      saveStore('drafts', store);
      return { content: [{ type: 'text', text: `Draft ${id} deleted.` }] };
    }
  );

  // ── Scheduled emails ─────────────────────────────────────────────────────

  server.tool(
    'schedule_email',
    'Schedule an email to be sent automatically at a future time (sent on next session start after the scheduled time)',
    {
      to: z.string(),
      subject: z.string(),
      body: z.string(),
      send_at: z.string().describe('ISO 8601 timestamp, e.g. "2026-06-10T09:00:00"'),
      cc: z.string().optional(),
      bcc: z.string().optional()
    },
    { destructiveHint: false },
    async ({ to, subject, body, send_at, cc, bcc }) => {
      const sendDate = new Date(send_at);
      if (isNaN(sendDate.getTime())) {
        return { content: [{ type: 'text', text: `Invalid date: ${send_at}. Use ISO 8601 format, e.g. "2026-06-10T09:00:00"` }] };
      }

      const store = loadStore('scheduled');
      if (!store.scheduled) store.scheduled = [];

      const item = {
        id: randomUUID(),
        to, subject, body,
        cc: cc || null,
        bcc: bcc || null,
        sendAt: sendDate.toISOString(),
        createdAt: new Date().toISOString()
      };

      store.scheduled.push(item);
      saveStore('scheduled', store);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ok: true,
            message: `Email scheduled for ${sendDate.toLocaleString()}`,
            id: item.id,
            to,
            subject,
            sendAt: item.sendAt
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    'list_scheduled',
    'List all pending scheduled emails',
    {},
    { readOnlyHint: true },
    async () => {
      const store = loadStore('scheduled');
      const items = (store.scheduled || []).map(s => {
        const sendAt = new Date(s.sendAt);
        const msLeft = sendAt.getTime() - Date.now();
        const hoursLeft = Math.round(msLeft / 36e5);
        return {
          id: s.id,
          to: s.to,
          subject: s.subject,
          sendAt: s.sendAt,
          timeLeft: msLeft > 0 ? `in ~${hoursLeft}h` : 'overdue — will send on next session'
        };
      });

      return {
        content: [{
          type: 'text',
          text: items.length === 0
            ? 'No scheduled emails.'
            : JSON.stringify(items, null, 2)
        }]
      };
    }
  );

  server.tool(
    'cancel_scheduled',
    'Cancel a scheduled email by its ID',
    { id: z.string() },
    { destructiveHint: true },
    async ({ id }) => {
      const store = loadStore('scheduled');
      const before = (store.scheduled || []).length;
      store.scheduled = (store.scheduled || []).filter(s => s.id !== id);

      if (store.scheduled.length === before) {
        return { content: [{ type: 'text', text: `No scheduled email found with ID: ${id}` }] };
      }

      saveStore('scheduled', store);
      return { content: [{ type: 'text', text: `Scheduled email ${id} cancelled.` }] };
    }
  );
}
