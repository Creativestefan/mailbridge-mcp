import { z } from 'zod';
import { createImapClient } from '../utils/imap.js';
import { getPriority } from '../utils/priority.js';
import { getCategory } from '../utils/categorize.js';

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

      const allUids = await client.search({ all: true }, { uid: true });
      const recentUids = allUids.slice(-limit);

      if (recentUids.length === 0) {
        await client.logout();
        return { content: [{ type: 'text', text: '[]' }] };
      }

      const messages = [];
      const uidRange = recentUids.join(',');
      for await (const msg of client.fetch(uidRange, { envelope: true }, { uid: true })) {
        const email = {
          uid: msg.uid,
          from: msg.envelope.from?.[0]?.address,
          from_name: msg.envelope.from?.[0]?.name,
          subject: msg.envelope.subject,
          date: msg.envelope.date
        };
        const { score } = getPriority(email);
        email.priority = score;
        email.category = getCategory(email);
        messages.push(email);
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
        const email = {
          uid: msg.uid,
          from: msg.envelope.from?.[0]?.address,
          from_name: msg.envelope.from?.[0]?.name,
          subject: msg.envelope.subject,
          date: msg.envelope.date,
          preview: fullText.slice(0, preview_length)
        };
        const { score } = getPriority(email);
        email.priority = score;
        email.category = getCategory(email);
        messages.push(email);
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

  // ── NEW: Thread View ────────────────────────────────────────────────────

  server.tool(
    'get_thread',
    'Fetch all emails in a conversation thread by following Message-ID, References, and In-Reply-To headers',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ uid, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      // Step 1: Get the target message's threading headers
      const target = await client.fetchOne(
        String(uid),
        { envelope: true, headers: ['message-id', 'references', 'in-reply-to'] },
        { uid: true }
      );

      if (!target) {
        await client.logout();
        return { content: [{ type: 'text', text: `No email found with UID ${uid}` }] };
      }

      const msgId = (target.headers?.get('message-id') || '').trim();
      const refs = (target.headers?.get('references') || '').trim();
      const inReplyTo = (target.headers?.get('in-reply-to') || '').trim();

      // Collect all IDs in the thread
      const threadIds = new Set(
        [msgId, inReplyTo, ...refs.split(/\s+/)]
          .map(s => s.trim())
          .filter(s => s.length > 5)
      );

      const threadUids = new Set([uid]);

      // Step 2: Search for related messages
      for (const id of threadIds) {
        if (!id) continue;
        try {
          const found = await client.search({ header: ['Message-ID', id] }, { uid: true });
          found.forEach(u => threadUids.add(u));
        } catch { /* skip unsupported searches */ }
        try {
          const found2 = await client.search({ header: ['References', id] }, { uid: true });
          found2.forEach(u => threadUids.add(u));
        } catch { /* skip */ }
        try {
          const found3 = await client.search({ header: ['In-Reply-To', id] }, { uid: true });
          found3.forEach(u => threadUids.add(u));
        } catch { /* skip */ }
      }

      // Step 3: Fetch all thread messages
      const messages = [];
      const uidRange = [...threadUids].join(',');
      for await (const msg of client.fetch(uidRange, { envelope: true, bodyParts: ['TEXT'] }, { uid: true })) {
        const bodyPart = msg.bodyParts?.get('text');
        const body = bodyPart ? Buffer.from(bodyPart).toString('utf8').replace(/\s+/g, ' ').trim().slice(0, 800) : '';
        messages.push({
          uid: msg.uid,
          from: msg.envelope.from?.[0]?.address,
          from_name: msg.envelope.from?.[0]?.name,
          to: msg.envelope.to?.[0]?.address,
          subject: msg.envelope.subject,
          date: msg.envelope.date,
          preview: body
        });
      }
      await client.logout();

      // Sort chronologically
      messages.sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            thread_length: messages.length,
            messages
          }, null, 2)
        }]
      };
    }
  );

  // ── NEW: Contact History ────────────────────────────────────────────────

  server.tool(
    'get_contact_history',
    'Get the full email history with a contact — searches both inbox and sent folders',
    {
      address: z.string().describe('Email address of the contact'),
      limit: z.number().default(20).describe('Max emails to return per folder')
    },
    { readOnlyHint: true },
    async ({ address, limit }) => {
      const client = await createImapClient();
      await client.connect();

      const results = [];
      const folders = [
        { name: 'INBOX', searchKey: 'from' },
        { name: 'Sent', searchKey: 'to' },
        { name: 'Sent Messages', searchKey: 'to' }  // iCloud
      ];

      for (const { name: folderName, searchKey } of folders) {
        try {
          await client.mailboxOpen(folderName);
          const uids = await client.search({ [searchKey]: address }, { uid: true });
          const recentUids = uids.slice(-limit);
          if (recentUids.length === 0) continue;

          for await (const msg of client.fetch(recentUids.join(','), { envelope: true }, { uid: true })) {
            results.push({
              uid: msg.uid,
              folder: folderName,
              direction: searchKey === 'from' ? 'received' : 'sent',
              from: msg.envelope.from?.[0]?.address,
              to: msg.envelope.to?.[0]?.address,
              subject: msg.envelope.subject,
              date: msg.envelope.date
            });
          }
        } catch { /* folder doesn't exist on this provider */ }
      }

      await client.logout();

      results.sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        content: [{
          type: 'text',
          text: results.length === 0
            ? `No emails found with ${address}`
            : JSON.stringify({ contact: address, total: results.length, history: results }, null, 2)
        }]
      };
    }
  );

  // ── NEW: Unified Inbox ──────────────────────────────────────────────────

  server.tool(
    'unified_inbox',
    'Fetch recent emails across multiple folders in one merged, date-sorted view',
    {
      folders: z.array(z.string()).default(['INBOX', 'Starred']).describe('Folders to include'),
      limit: z.number().default(30).describe('Max emails per folder')
    },
    { readOnlyHint: true },
    async ({ folders, limit }) => {
      const client = await createImapClient();
      await client.connect();

      const seen = new Set();
      const allMessages = [];

      for (const folderName of folders) {
        try {
          await client.mailboxOpen(folderName);
          const allUids = await client.search({ all: true }, { uid: true });
          const recentUids = allUids.slice(-limit);
          if (recentUids.length === 0) continue;

          for await (const msg of client.fetch(recentUids.join(','), { envelope: true, bodyParts: ['TEXT'] }, { uid: true })) {
            const dedupeKey = msg.envelope.messageId || `${folderName}-${msg.uid}`;
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);

            const bodyPart = msg.bodyParts?.get('text');
            const preview = bodyPart ? Buffer.from(bodyPart).toString('utf8').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
            const email = {
              uid: msg.uid,
              folder: folderName,
              from: msg.envelope.from?.[0]?.address,
              from_name: msg.envelope.from?.[0]?.name,
              subject: msg.envelope.subject,
              date: msg.envelope.date,
              preview
            };
            const { score } = getPriority(email);
            email.priority = score;
            email.category = getCategory(email);
            allMessages.push(email);
          }
        } catch { /* folder not available */ }
      }

      await client.logout();
      allMessages.sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(allMessages, null, 2)
        }]
      };
    }
  );

  // ── NEW: Export Email ───────────────────────────────────────────────────

  server.tool(
    'export_email',
    'Export an email as clean Markdown — useful for saving, sharing, or archiving important messages',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ uid, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      const message = await client.fetchOne(
        String(uid),
        { envelope: true, bodyParts: ['TEXT'], bodyStructure: true },
        { uid: true }
      );
      await client.logout();

      if (!message) {
        return { content: [{ type: 'text', text: `No email found with UID ${uid} in ${folder}` }] };
      }

      const from = `${message.envelope.from?.[0]?.name || ''} <${message.envelope.from?.[0]?.address || ''}>`.trim();
      const to = message.envelope.to?.map(t => t.address).join(', ') || '';
      const subject = message.envelope.subject || '(no subject)';
      const date = message.envelope.date ? new Date(message.envelope.date).toLocaleString() : '';

      const bodyPart = message.bodyParts?.get('text');
      const body = bodyPart
        ? Buffer.from(bodyPart).toString('utf8')
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+$/gm, '')
            .trim()
        : '*(no text body)*';

      // Find attachments in body structure
      const attachments = [];
      function findAttachments(node) {
        if (!node) return;
        if (node.disposition === 'attachment' && node.parameters?.name) {
          const sizeKB = node.size ? `${Math.round(node.size / 1024)} KB` : '';
          attachments.push(`${node.parameters.name}${sizeKB ? ` — ${sizeKB}` : ''}`);
        }
        (node.childNodes || []).forEach(findAttachments);
      }
      if (message.bodyStructure) findAttachments(message.bodyStructure);

      const md = [
        `# ${subject}`,
        ``,
        `**From:** ${from}  `,
        `**To:** ${to}  `,
        `**Date:** ${date}  `,
        `**UID:** ${uid}`,
        ``,
        `---`,
        ``,
        body,
        attachments.length > 0 ? `\n---\n\n📎 **Attachments:** ${attachments.join(', ')}` : ''
      ].join('\n').trim();

      return { content: [{ type: 'text', text: md }] };
    }
  );

  // ── NEW: Extract Calendar Events ────────────────────────────────────────

  server.tool(
    'extract_calendar_events',
    'Extract event details (dates, times, locations) from an email — also parses .ics attachments',
    {
      uid: z.number(),
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ uid, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      const message = await client.fetchOne(
        String(uid),
        { envelope: true, bodyParts: ['TEXT'], bodyStructure: true },
        { uid: true }
      );

      if (!message) {
        await client.logout();
        return { content: [{ type: 'text', text: `No email found with UID ${uid}` }] };
      }

      const bodyPart = message.bodyParts?.get('text');
      const bodyText = bodyPart ? Buffer.from(bodyPart).toString('utf8') : '';

      // Find .ics attachments
      const icsParts = [];
      function findIcs(node) {
        if (!node) return;
        const name = node.parameters?.name || '';
        if (name.endsWith('.ics') || node.type === 'text' && node.subtype === 'calendar') {
          icsParts.push(node.part);
        }
        (node.childNodes || []).forEach(findIcs);
      }
      if (message.bodyStructure) findIcs(message.bodyStructure);

      const events = [];

      // Parse .ics content
      for (const partId of icsParts) {
        try {
          const fetched = await client.fetchOne(String(uid), { bodyParts: [partId] }, { uid: true });
          const icsData = fetched?.bodyParts?.get(partId);
          if (!icsData) continue;
          const icsText = Buffer.from(icsData).toString('utf8');

          const veventBlocks = icsText.split('BEGIN:VEVENT');
          for (let i = 1; i < veventBlocks.length; i++) {
            const block = veventBlocks[i];
            const get = key => {
              const match = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
              return match ? match[1].trim() : null;
            };
            events.push({
              source: 'ics',
              title: get('SUMMARY'),
              start: get('DTSTART'),
              end: get('DTEND'),
              location: get('LOCATION'),
              description: get('DESCRIPTION')?.slice(0, 200),
              organizer: get('ORGANIZER')
            });
          }
        } catch { /* skip unparseable .ics */ }
      }

      await client.logout();

      // Text-based extraction (fallback / supplement)
      if (events.length === 0) {
        const datePatterns = [
          /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{4}/gi,
          /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
          /\b\d{4}-\d{2}-\d{2}\b/g
        ];
        const timePattern = /\b\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?\b|\b\d{1,2}\s*(?:am|pm|AM|PM)\b/g;
        const locationPattern = /(?:location|venue|address|room|building|at):\s*([^\n\r.]+)/gi;

        const dates = [];
        datePatterns.forEach(re => {
          const matches = bodyText.match(re) || [];
          dates.push(...matches);
        });
        const times = bodyText.match(timePattern) || [];
        const locations = [];
        let lm;
        while ((lm = locationPattern.exec(bodyText)) !== null) {
          locations.push(lm[1].trim().slice(0, 100));
        }

        if (dates.length > 0 || times.length > 0) {
          events.push({
            source: 'text',
            title: message.envelope.subject,
            dates: [...new Set(dates)].slice(0, 5),
            times: [...new Set(times)].slice(0, 5),
            locations: [...new Set(locations)].slice(0, 3)
          });
        }
      }

      return {
        content: [{
          type: 'text',
          text: events.length === 0
            ? 'No calendar events found in this email.'
            : JSON.stringify({ events_found: events.length, events }, null, 2)
        }]
      };
    }
  );
}
