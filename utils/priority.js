/**
 * priority.js — Score an email's urgency 1–5
 * Pure keyword analysis of subject, sender, and preview text.
 * No network calls, no AI — fast local classification.
 */

const SCORE_5 = [/\burgent\b/i, /\basap\b/i, /\bemergency\b/i, /\bcritical\b/i, /\baction required now\b/i, /\boverdue\b/i];
const SCORE_4 = [/\baction required\b/i, /\bdeadline\b/i, /\bdue today\b/i, /\breply needed\b/i, /\bwaiting on you\b/i, /\binvoice due\b/i, /\bpayment overdue\b/i, /\bfinal notice\b/i, /\blast chance\b/i, /\bplease respond\b/i, /\bconfirm.*today\b/i];
const SCORE_3 = [/\bimportant\b/i, /\bplease review\b/i, /\bfollow.?up\b/i, /\breminder\b/i, /\bfyi\b/i, /\bfor your attention\b/i];
const LOW_SIGNALS = [/\bnewsletter\b/i, /\bunsubscribe\b/i, /\bno.?reply\b/i, /\bnotification\b/i, /\bautomat\b/i, /\bpromo\b/i, /\bdeal\b/i, /\boffer\b/i, /\bdiscount\b/i];

/**
 * @param {{ subject?: string, from?: string, preview?: string }} email
 * @returns {{ score: number, reason: string }}
 */
export function getPriority(email) {
  const text = [email.subject || '', email.from || '', email.preview || ''].join(' ');

  if (SCORE_5.some(re => re.test(text))) return { score: 5, reason: 'critical keywords' };
  if (SCORE_4.some(re => re.test(text))) return { score: 4, reason: 'action required' };

  // Low signals override to score 1
  if (LOW_SIGNALS.some(re => re.test(text))) return { score: 1, reason: 'automated/promotional' };

  if (SCORE_3.some(re => re.test(text))) return { score: 3, reason: 'flagged as important' };

  return { score: 2, reason: 'normal' };
}
