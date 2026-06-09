/**
 * categorize.js — Classify an email into a broad category
 * Keyword matching on subject, sender, and preview text.
 * Categories: ActionRequired | Finance | Travel | Calendar | Social | Newsletter | Updates
 */

const RULES = [
  {
    category: 'ActionRequired',
    patterns: [/\baction required\b/i, /\breply needed\b/i, /\bwaiting on you\b/i, /\bplease confirm\b/i, /\bplease respond\b/i, /\bapproval needed\b/i, /\byour response\b/i, /\bdeadline\b/i, /\basap\b/i, /\burgent\b/i]
  },
  {
    category: 'Finance',
    patterns: [/\binvoice\b/i, /\bpayment\b/i, /\breceipt\b/i, /\bbilling\b/i, /\bsubscription\b/i, /\bamount due\b/i, /\border confirm/i, /\brefund\b/i, /\btransaction\b/i, /\bstatement\b/i, /\bpurchase\b/i, /\bcharge\b/i]
  },
  {
    category: 'Travel',
    patterns: [/\bbooking confirm/i, /\breservation\b/i, /\bflight\b/i, /\bhotel\b/i, /\bitinerary\b/i, /\bboarding pass\b/i, /\bcheck.?in\b/i, /\bairbnb\b/i, /\bexpedia\b/i, /\btrip\b/i]
  },
  {
    category: 'Calendar',
    patterns: [/\bmeeting\b/i, /\binvit(e|ation)\b/i, /\bscheduled\b/i, /\bappointment\b/i, /\brsvp\b/i, /\bjoin.*zoom\b/i, /\bjoin.*meet\b/i, /\bcalendar\b/i, /\bwebinar\b/i, /\bconference\b/i]
  },
  {
    category: 'Social',
    patterns: [/\blinkedin\b/i, /\btwitter\b/i, /\binstagram\b/i, /\bfacebook\b/i, /\bgithub\b/i, /\bslack\b/i, /\bdiscord\b/i, /\bmentioned you\b/i, /\bcommented on\b/i, /\bfollowed you\b/i]
  },
  {
    category: 'Newsletter',
    patterns: [/\bnewsletter\b/i, /\bunsubscribe\b/i, /\bmailing list\b/i, /\bno.?reply@/i, /\bdigest\b/i, /\bweekly.*update\b/i, /\bmonthly.*update\b/i, /\bedition\b/i]
  }
];

/**
 * @param {{ subject?: string, from?: string, preview?: string }} email
 * @returns string
 */
export function getCategory(email) {
  const text = [email.subject || '', email.from || '', email.preview || ''].join(' ');
  for (const { category, patterns } of RULES) {
    if (patterns.some(re => re.test(text))) return category;
  }
  return 'Updates';
}
