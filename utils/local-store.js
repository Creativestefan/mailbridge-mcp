/**
 * local-store.js — Generic JSON store helper
 * All Mailbridge local state lives in ~/.mailbridge-{name}.json
 * Passwords NEVER go here — those stay in the OS credential store via keytar.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

function storePath(name) {
  return join(homedir(), `.mailbridge-${name}.json`);
}

export function loadStore(name) {
  const path = storePath(name);
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
}

export function saveStore(name, data) {
  writeFileSync(storePath(name), JSON.stringify(data, null, 2));
}
