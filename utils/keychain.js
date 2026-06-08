/**
 * macOS Keychain wrapper using the built-in `security` CLI.
 * No npm packages — works on every Mac, survives plugin reinstalls.
 * Service name: mailbridge
 */
import { execFileSync } from 'child_process';

const SERVICE = 'mailbridge';

export function savePassword(accountName, password) {
  // -U = update if exists
  execFileSync('security', [
    'add-generic-password',
    '-a', accountName,
    '-s', SERVICE,
    '-w', password,
    '-U'
  ]);
}

export function getPassword(accountName) {
  try {
    return execFileSync('security', [
      'find-generic-password',
      '-a', accountName,
      '-s', SERVICE,
      '-w'
    ], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

export function deletePassword(accountName) {
  try {
    execFileSync('security', [
      'delete-generic-password',
      '-a', accountName,
      '-s', SERVICE
    ]);
  } catch {}
}
