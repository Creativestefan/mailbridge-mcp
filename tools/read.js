import { z } from 'zod';
import { createImapClient } from '../utils/imap.js';

export function registerReadTools(server) {
  server.tool(
    'read_emails',
    'Read recent emails from a mailbox folder',
    {
      folder: z.string().default('INBOX'),
      limit: z.number().default(10)
    },
    { readOnlyHint: true },
    async ({ folder, limit }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      // Get all UIDs (lightweight — no body download), take the last N
      const allUids = await client.search({ all: true }, { uid: true });
      const recentUids = allUids.slice(-limit);

      if (recentUids.length === 0) {
        await client.logout();
        return { content: [{ type: 'text', text: '[]' }] };
      }

      const messages = [];
      const uidRange = recentUids.join(',');
      for await (const msg of client.fetch(uidRange, { envelope: true }, { uid: true })) {
        messages.push({
          uid: msg.uid,
          from: msg.envelope.from?.[0]?.address,
          subject: msg.envelope.subject,
          date: msg.envelope.date
        });
      }
      await client.logout();
      return { content: [{ type: 'text', text: JSON.stringify(messages.reverse(), null, 2) }] };
    }
  );

  server.tool(
    'get_email_body',
    'Get the full text body of a specific email by UID',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ uid, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);
      const message = await client.fetchOne(String(uid), { envelope: true, bodyParts: ['TEXT'] }, { uid: true });
      await client.logout();

      if (!message) {
        return { content: [{ type: 'text', text: `No email found with UID ${uid} in ${folder}` }] };
      }

      const bodyPart = message.bodyParts?.get('text');
      const body = bodyPart ? Buffer.from(bodyPart).toString('utf8') : '(no text body)';

      const result = {
        uid: message.uid,
        from: message.envelope.from?.[0]?.address,
        to: message.envelope.to?.[0]?.address,
        subject: message.envelope.subject,
        date: message.envelope.date,
        body
      };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'get_emails_with_preview',
    'Fetch recent emails with a short body preview in a single pass — ideal for inbox summaries. More efficient than calling get_email_body for each email.',
    {
      folder: z.string().default('INBOX'),
      limit: z.number().default(50),
      preview_length: z.number().default(400)
    },
    { readOnlyHint: true },
    async ({ folder, limit, preview_length }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      // Get all UIDs (lightweight), take the last N, then fetch body for only those
      const allUids = await client.search({ all: true }, { uid: true });
      const recentUids = allUids.slice(-limit);

      if (recentUids.length === 0) {
        await client.logout();
        return { content: [{ type: 'text', text: '[]' }] };
      }

      const messages = [];
      const uidRange = recentUids.join(',');
      for await (const msg of client.fetch(uidRange, { envelope: true, bodyParts: ['TEXT'] }, { uid: true })) {
        const bodyPart = msg.bodyParts?.get('text');
        const fullText = bodyPart ? Buffer.from(bodyPart).toString('utf8').replace(/\s+/g, ' ').trim() : '';
        messages.push({
          uid: msg.uid,
          from: msg.envelope.from?.[0]?.address,
          from_name: msg.envelope.from?.[0]?.name,
          subject: msg.envelope.subject,
          date: msg.envelope.date,
          preview: fullText.slice(0, preview_length)
        });
      }
      await client.logout();
      return { content: [{ type: 'text', text: JSON.stringify(messages.reverse(), null, 2) }] };
    }
  );

  server.tool(
    'search_emails',
    'Search emails by sender, subject, or keyword',
    {
      query: z.string(),
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ query, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);
      const uids = await client.search({
        or: [{ subject: query }, { from: query }, { body: query }]
      });
      await client.logout();
      return {
        content: [{
          type: 'text',
          text: `Found ${uids.length} matching emails. UIDs: ${uids.join(', ') || 'none'}`
        }]
      };
    }
  );
}
