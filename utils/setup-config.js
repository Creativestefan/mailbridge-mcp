/**
 * setup-config.js — single source of truth for the setup portal address.
 * Imported by both setup.js (the server) and tools/accounts.js (the open_setup
 * tool) so the URL shown to the user always matches where the server listens.
 */
export const SETUP_PORT = 52693;
export const SETUP_URL = `http://127.0.0.1:${SETUP_PORT}`;
