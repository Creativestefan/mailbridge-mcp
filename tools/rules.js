/**
 * rules.js — Local email rules engine
 * Rules stored in ~/.mailbridge-rules.json
 * Rules are evaluated by the AI during inbox_summary to annotate emails.
 */
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { loadStore, saveStore } from '../utils/local-store.js';

export function registerRuleTools(server) {

  server.tool(
    'add_rule',
    'Add a local email rule — conditions are checked during inbox summaries to flag or categorise matching emails',
    {
      name: z.string().describe('Unique name for the rule, e.g. "flag boss emails"'),
      condition_field: z.enum(['from', 'subject', 'to', 'body']).describe('Which part of the email to match'),
      condition_operator: z.enum(['contains', 'equals', 'starts_with', 'ends_with']).describe('How to match'),
      condition_value: z.string().describe('Value to match against'),
      action_type: z.enum(['flag', 'category', 'priority']).describe('What to do when matched'),
      action_value: z.string().describe('flag: "urgent"|"review"|"vip" | category: "Finance"|"Travel"|etc | priority: "1"-"5"')
    },
    { destructiveHint: false },
    async ({ name, condition_field, condition_operator, condition_value, action_type, action_value }) => {
      const store = loadStore('rules');
      if (!store.rules) store.rules = [];

      // Prevent duplicate names
      if (store.rules.some(r => r.name === name)) {
        return { content: [{ type: 'text', text: `A rule named "${name}" already exists. Remove it first or choose a different name.` }] };
      }

      const rule = {
        id: randomUUID(),
        name,
        condition: { field: condition_field, operator: condition_operator, value: condition_value },
        action: { type: action_type, value: action_value },
        createdAt: new Date().toISOString()
      };

      store.rules.push(rule);
      saveStore('rules', store);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            ok: true,
            message: `Rule "${name}" added`,
            rule
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    'list_rules',
    'List all configured email rules',
    {},
    { readOnlyHint: true },
    async () => {
      const store = loadStore('rules');
      const rules = store.rules || [];

      if (rules.length === 0) {
        return { content: [{ type: 'text', text: 'No rules configured.' }] };
      }

      const summary = rules.map(r =>
        `• [${r.name}] if ${r.condition.field} ${r.condition.operator} "${r.condition.value}" → ${r.action.type}: ${r.action.value}`
      ).join('\n');

      return { content: [{ type: 'text', text: summary }] };
    }
  );

  server.tool(
    'remove_rule',
    'Remove an email rule by name',
    { name: z.string() },
    { destructiveHint: true },
    async ({ name }) => {
      const store = loadStore('rules');
      const before = (store.rules || []).length;
      store.rules = (store.rules || []).filter(r => r.name !== name);

      if (store.rules.length === before) {
        return { content: [{ type: 'text', text: `No rule found with name: "${name}"` }] };
      }

      saveStore('rules', store);
      return { content: [{ type: 'text', text: `Rule "${name}" removed.` }] };
    }
  );

  server.tool(
    'apply_rules',
    'Test your rules against a list of emails and see which ones would be flagged',
    {
      uids: z.array(z.number()).describe('UIDs to test rules against'),
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ uids, folder }) => {
      const store = loadStore('rules');
      const rules = store.rules || [];

      if (rules.length === 0) {
        return { content: [{ type: 'text', text: 'No rules configured. Add rules with add_rule first.' }] };
      }

      // Import createImapClient lazily to avoid circular deps
      const { createImapClient } = await import('../utils/imap.js');
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      const messages = [];
      const uidRange = uids.join(',');
      for await (const msg of client.fetch(uidRange, { envelope: true }, { uid: true })) {
        messages.push({
          uid: msg.uid,
          from: msg.envelope.from?.[0]?.address || '',
          to: msg.envelope.to?.[0]?.address || '',
          subject: msg.envelope.subject || ''
        });
      }
      await client.logout();

      const results = [];
      for (const email of messages) {
        const matches = [];
        for (const rule of rules) {
          const fieldValue = email[rule.condition.field] || '';
          const target = rule.condition.value;
          let matched = false;
          switch (rule.condition.operator) {
            case 'contains': matched = fieldValue.toLowerCase().includes(target.toLowerCase()); break;
            case 'equals': matched = fieldValue.toLowerCase() === target.toLowerCase(); break;
            case 'starts_with': matched = fieldValue.toLowerCase().startsWith(target.toLowerCase()); break;
            case 'ends_with': matched = fieldValue.toLowerCase().endsWith(target.toLowerCase()); break;
          }
          if (matched) matches.push({ rule: rule.name, action: rule.action });
        }
        if (matches.length > 0) {
          results.push({ uid: email.uid, subject: email.subject, from: email.from, matches });
        }
      }

      return {
        content: [{
          type: 'text',
          text: results.length === 0
            ? 'No emails matched any rules.'
            : JSON.stringify(results, null, 2)
        }]
      };
    }
  );
}
