import { ImapFlow } from 'imapflow';
import { getActiveAccount } from './accounts.js';

export function createImapClient() {
  const account = getActiveAccount();
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
