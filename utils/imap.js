import { ImapFlow } from 'imapflow';
import { getActiveAccount } from './accounts.js';

/**
 * IMAP connection gate — serialises access to ONE connection at a time.
 *
 * Why: iCloud (and most IMAP providers) throttle aggressively when a single
 * account opens many simultaneous connections or churns connect/logout rapidly.
 * In chat that never happens — tool calls run one at a time. But an artifact or
 * any client that fans out parallel tool calls would open several iCloud logins
 * at once, tripping the throttle and making the connector flap (connect 400s /
 * "reconnecting"). Serialising connections keeps bursts reliable.
 *
 * The gate is acquired inside client.connect() and released on the first of:
 * logout, connection close, connection error, or a safety timeout — so a tool
 * that throws mid-operation without logging out can never deadlock the queue.
 */
let chain = Promise.resolve();
function acquireGate() {
  let releaseReady;
  const ready = new Promise((r) => { releaseReady = r; });
  const prev = chain;
  chain = chain.then(() => ready);
  return prev.then(() => releaseReady);
}

// Never hold the gate longer than this, even if logout/close never fire.
// Sits above socketTimeout (30s) so normal slow ops finish first.
const MAX_HOLD_MS = 60000;

export async function createImapClient() {
  const account = await getActiveAccount();
  const client = new ImapFlow({
    host: account.imap.host,
    port: account.imap.port,
    secure: account.imap.secure,
    auth: {
      user: account.imap.user,
      pass: account.imap.password
    },
    logger: false,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000
  });

  let releaseFn = null;
  let released = false;
  let safetyTimer = null;
  const release = () => {
    if (released) return;
    released = true;
    if (safetyTimer) clearTimeout(safetyTimer);
    if (releaseFn) releaseFn();
  };

  // Wrap connect: wait for the gate before opening the socket.
  const origConnect = client.connect.bind(client);
  client.connect = async (...args) => {
    releaseFn = await acquireGate();
    safetyTimer = setTimeout(release, MAX_HOLD_MS);
    if (safetyTimer.unref) safetyTimer.unref();
    try {
      return await origConnect(...args);
    } catch (err) {
      release(); // failed login/connect — free the slot immediately
      throw err;
    }
  };

  // Wrap logout: always release the gate, even if logout throws.
  const origLogout = client.logout.bind(client);
  client.logout = async (...args) => {
    try {
      return await origLogout(...args);
    } finally {
      release();
    }
  };

  // Abnormal drops (timeout, server reset) free the slot too.
  client.on('close', release);
  client.on('error', release);

  return client;
}
