import { ImapFlow } from 'imapflow';
import { getActiveAccount } from './accounts.js';

export async function createImapClient() {
  const account = await getActiveAccount();
  return new ImapFlow({
    host: account.imap.host,
    port: account.imap.port,
    secure: account.imap.secure,
    auth: {
      user: account.imap.user,
      pass: account.imap.password
    },
    logger: false
  });
}
