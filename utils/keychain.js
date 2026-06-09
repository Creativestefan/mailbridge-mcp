/**
 * Cross-platform credential storage via keytar.
 * Routes to the OS native store on each platform:
 *   macOS   → Keychain
 *   Windows → Credential Manager
 *   Linux   → GNOME Keyring / KWallet (libsecret)
 */
import keytar from 'keytar';

const SERVICE = 'mailbridge';

export async function savePassword(accountName, password) {
  await keytar.setPassword(SERVICE, accountName, password);
}

export async function getPassword(accountName) {
  return await keytar.getPassword(SERVICE, accountName);
}

export async function deletePassword(accountName) {
  await keytar.deletePassword(SERVICE, accountName);
}
