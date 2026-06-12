/**
 * receipts.js — Email read receipts (RFC 8098 MDN — Message Disposition Notifications)
 *
 * Fully local, no infrastructure. On send we ask the recipient's mail client to
 * confirm the message was displayed; if they agree, their client emails back a
 * machine-readable disposition-notification. We detect those by scanning the inbox.
 *
 * Honest limitation: receipts only arrive if the recipient's client supports MDN
 * AND the recipient agrees to send one. The ABSENCE of a receipt does NOT mean the
 * email went unread — many clients (e.g. Gmail web) ignore the request entirely.
 *
 * Tracking metadata lives in ~/.mailbridge-receipts.json — no passwords, no pixels,
 * nothing leaves the device.
 */
import { z } from 'zod';
import { createImapClient } from '../utils/imap.js';
import { loadStore, saveStore } from '../utils/local-store.js';

const STORE = 'receipts';

/** Normalise a Message-ID for comparison (strip angle brackets and whitespace). */
function normalizeId(id) {
  return (id || '').replace(/[<>]/g, '').trim().toLowerCase();
}

/**
 * Headers that request a read receipt. Several variants are sent because clients
 * disagree on which they honour: Disposition-Notification-To is the RFC 8098
 * standard; Return-Receipt-To and X-Confirm-Reading-To cover older clients.
 */
export function receiptHeaders(account) {
  const addr = account.smtp.user;
  return {
    'Disposition-Notification-To': addr,
    'Return-Receipt-To': addr,
    'X-Confirm-Reading-To': addr
  };
}

/** Record an outgoing tracked email so check_email_opens can match its receipt later. */
export function recordTrackedSend({ messageId, to, subject }) {
  if (!messageId) return;
  const store = loadStore(STORE);
  if (!Array.isArray(store.sent)) store.sent = [];
  store.sent.push({
    messageId,
    to,
    subject,
    sentAt: new Date().toISOString(),
    opened: false,
    openedAt: null,
    openedBy: null,
    disposition: null
  });
  saveStore(STORE, store);
}

/**
 * Parse a disposition-notification report from raw message source.
 * Returns { originalMessageId, finalRecipient, disposition } or null.
 */
function parseDispositionReport(source) {
  if (!source) return null;
  const text = source.toString('utf8');

  // The machine-readable part is `Content-Type: message/disposition-notification`.
  const partIdx = text.search(/Content-Type:\s*message\/disposition-notification/i);
  if (partIdx === -1) return null;
  const block = text.slice(partIdx);

  const field = (name) => {
    const m = block.match(new RegExp(`^${name}\\s*:\\s*(.+)$`, 'im'));
    return m ? m[1].trim() : null;
  };

  // Final-Recipient: rfc822; user@example.com  → take the address after the ';'
  const rawFinal = field('Final-Recipient') || field('Original-Recipient');
  const finalRecipient = rawFinal ? rawFinal.split(';').pop().trim() : null;

  // Disposition: manual-action/MDN-sent-manually; displayed
  const rawDisp = field('Disposition');
  const disposition = rawDisp ? (rawDisp.split(';').pop().trim().split('/').pop().trim()) : null;

  return {
    originalMessageId: field('Original-Message-ID'),
    finalRecipient,
    disposition
  };
}

export function registerReceiptTools(server) {
  server.tool(
    'check_email_opens',
    'Scan the inbox for read-receipt confirmations (MDN) and report which tracked emails have been opened, by whom, and when. Only finds opens for emails sent with request_receipt enabled.',
    {
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ folder }) => {
      const store = loadStore(STORE);
      const sent = Array.isArray(store.sent) ? store.sent : [];
      const pending = sent.filter(s => !s.opened);

      if (sent.length === 0) {
        return { content: [{ type: 'text', text: 'No tracked emails yet. Send an email with a read receipt requested to start tracking.' }] };
      }

      // Only scan back as far as the earliest still-unconfirmed send (default 30 days).
      let since;
      if (pending.length > 0) {
        const earliest = pending.reduce((min, s) => (s.sentAt < min ? s.sentAt : min), pending[0].sentAt);
        since = new Date(earliest);
      } else {
        since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }

      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      // Find candidate report messages. The standard signal is the Content-Type
      // header carrying report-type=disposition-notification.
      const candidates = new Set();
      try {
        const found = await client.search({ since, header: ['Content-Type', 'disposition-notification'] }, { uid: true });
        found.forEach(u => candidates.add(u));
      } catch { /* server may not support header search — fall back below */ }

      // Fallback: scan recent messages since `since` and inspect each source.
      if (candidates.size === 0) {
        try {
          const recent = await client.search({ since }, { uid: true });
          recent.slice(-100).forEach(u => candidates.add(u));
        } catch { /* ignore */ }
      }

      const newlyOpened = [];
      if (candidates.size > 0) {
        const uidRange = [...candidates].join(',');
        for await (const msg of client.fetch(uidRange, { envelope: true, source: true }, { uid: true })) {
          const report = parseDispositionReport(msg.source);
          if (!report) continue;

          // Match the report to a tracked send: prefer Original-Message-ID from the
          // report body, then fall back to the report's In-Reply-To / References.
          const candidateIds = [
            report.originalMessageId,
            msg.envelope.inReplyTo,
            ...(msg.envelope.references || [])
          ].map(normalizeId).filter(Boolean);

          const match = sent.find(s => candidateIds.includes(normalizeId(s.messageId)));
          if (match && !match.opened) {
            match.opened = true;
            match.openedAt = (msg.envelope.date || new Date()).toISOString?.() || new Date().toISOString();
            match.openedBy = report.finalRecipient || match.to;
            match.disposition = report.disposition || 'displayed';
            newlyOpened.push(match);
          }
        }
      }
      await client.logout();

      saveStore(STORE, store);

      const opened = sent.filter(s => s.opened);
      const awaiting = sent.filter(s => !s.opened);

      const lines = [];
      lines.push(`📬 Read receipts — ${opened.length} opened, ${awaiting.length} awaiting (of ${sent.length} tracked)`);
      if (newlyOpened.length > 0) {
        lines.push('', '✅ Newly confirmed:');
        newlyOpened.forEach(s => lines.push(`  • "${s.subject}" → ${s.openedBy} at ${s.openedAt} (${s.disposition})`));
      }
      if (opened.length > 0) {
        lines.push('', 'Opened:');
        opened.forEach(s => lines.push(`  ✓ "${s.subject}" → ${s.openedBy} · ${s.openedAt}`));
      }
      if (awaiting.length > 0) {
        lines.push('', 'Awaiting a receipt:');
        awaiting.forEach(s => lines.push(`  … "${s.subject}" → ${s.to} · sent ${s.sentAt}`));
      }
      lines.push('', 'Note: "awaiting" does NOT mean unread. A receipt only arrives if the recipient\'s mail app supports read receipts and they choose to send one (Gmail web, for example, ignores the request).');

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }
  );

  server.tool(
    'list_tracked_emails',
    'List all emails sent with a read receipt requested and their current open status, without scanning the inbox.',
    {},
    { readOnlyHint: true },
    async () => {
      const store = loadStore(STORE);
      const sent = Array.isArray(store.sent) ? store.sent : [];
      if (sent.length === 0) {
        return { content: [{ type: 'text', text: 'No tracked emails yet.' }] };
      }
      const rows = sent
        .slice()
        .reverse()
        .map(s => s.opened
          ? `  ✓ Opened — "${s.subject}" → ${s.openedBy} · ${s.openedAt}`
          : `  … Awaiting — "${s.subject}" → ${s.to} · sent ${s.sentAt}`);
      return { content: [{ type: 'text', text: `Tracked emails (${sent.length}):\n${rows.join('\n')}\n\nRun check_email_opens to refresh against the inbox.` }] };
    }
  );
}
