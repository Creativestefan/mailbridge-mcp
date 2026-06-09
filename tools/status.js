import { createImapClient } from '../utils/imap.js';
import { getActiveAccount, loadConfig } from '../utils/accounts.js';

export function registerStatusTools(server) {
  server.tool(
    'check_connection',
    'Test the active email account connection and return live status, inbox count, and unread count',
    {},
    { readOnlyHint: true },
    async () => {
      let account;
      try {
        account = await getActiveAccount();
      } catch (err) {
        return { content: [{ type: 'text', text: JSON.stringify({ connected: false, error: err.message }, null, 2) }] };
      }

      const config = loadConfig();
      const totalAccounts = Object.keys(config.accounts).length;

      const client = await createImapClient();
      try {
        await client.connect();
        const inboxStatus = await client.status('INBOX', { messages: true, unseen: true });
        await client.logout();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              connected: true,
              active_account: account.name,
              label: account.label,
              host: account.imap.host,
              inbox: { total: inboxStatus.messages, unread: inboxStatus.unseen },
              total_accounts: totalAccounts,
              all_accounts: Object.keys(config.accounts)
            }, null, 2)
          }]
        };
      } catch (err) {
        try { await client.logout(); } catch {}
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              connected: false,
              active_account: account.name,
              label: account.label,
              host: account.imap.host,
              error: err.message
            }, null, 2)
          }]
        };
      }
    }
  );
}
