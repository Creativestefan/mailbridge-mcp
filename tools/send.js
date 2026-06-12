import { z } from 'zod';
import { createImapClient } from '../utils/imap.js';
import { createTransporter } from '../utils/smtp.js';
import { getActiveAccount } from '../utils/accounts.js';
import { receiptHeaders, recordTrackedSend } from './receipts.js';

export function registerSendTools(server) {
  server.tool(
    'send_email',
    'Compose and send a new email',
    {
      to: z.string(),
      subject: z.string(),
      body: z.string(),
      cc: z.string().optional(),
      bcc: z.string().optional(),
      request_receipt: z.boolean().optional()
    },
    { destructiveHint: true },
    async ({ to, subject, body, cc, bcc, request_receipt }) => {
      const account = await getActiveAccount();
      const transporter = await createTransporter();
      const message = {
        from: account.smtp.user,
        to,
        cc,
        bcc,
        subject,
        text: body
      };
      if (request_receipt) message.headers = receiptHeaders(account);
      const info = await transporter.sendMail(message);
      if (request_receipt) recordTrackedSend({ messageId: info.messageId, to, subject });
      const note = request_receipt ? ' (read receipt requested)' : '';
      return { content: [{ type: 'text', text: `Email sent to ${to}${note}` }] };
    }
  );

  server.tool(
    'reply_to_email',
    'Reply to an existing email thread',
    {
      uid: z.number(),
      body: z.string(),
      folder: z.string().default('INBOX'),
      request_receipt: z.boolean().optional()
    },
    { destructiveHint: true },
    async ({ uid, body, folder, request_receipt }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);
      const original = await client.fetchOne(String(uid), { envelope: true }, { uid: true });
      await client.logout();

      if (!original) {
        return { content: [{ type: 'text', text: `No email found with UID ${uid}` }] };
      }

      const replyTo = original.envelope.replyTo?.[0]?.address
        || original.envelope.from?.[0]?.address;
      const subject = original.envelope.subject?.startsWith('Re:')
        ? original.envelope.subject
        : `Re: ${original.envelope.subject}`;
      const messageId = original.envelope.messageId;

      const account = await getActiveAccount();
      const transporter = await createTransporter();
      const message = {
        from: account.smtp.user,
        to: replyTo,
        subject,
        text: body,
        references: messageId,
        inReplyTo: messageId
      };
      if (request_receipt) message.headers = receiptHeaders(account);
      const info = await transporter.sendMail(message);
      if (request_receipt) recordTrackedSend({ messageId: info.messageId, to: replyTo, subject });

      const note = request_receipt ? ' (read receipt requested)' : '';
      return { content: [{ type: 'text', text: `Reply sent to ${replyTo}${note}` }] };
    }
  );
}
