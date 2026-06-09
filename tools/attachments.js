import { z } from 'zod';
import { createImapClient } from '../utils/imap.js';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, extname } from 'path';

const SIZE_LIMIT_BYTES = 20 * 1024 * 1024; // 20MB

// ── Safety lists ────────────────────────────────────────────────────────────

// Extensions that are outright blocked — executables and scripts
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif', '.reg',
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.ps1', '.ps2', '.psc1', '.psc2',
  '.jar', '.class',
  '.sh', '.bash', '.zsh', '.fish',
  '.dmg', '.pkg', '.deb', '.rpm',
  '.app', '.ipa', '.apk',
  '.hta', '.cpl', '.inf', '.lnk',
]);

// MIME types that are blocked
const BLOCKED_MIME = new Set([
  'application/x-msdownload',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-msi',
  'application/x-bat',
  'application/x-sh',
  'application/x-shellscript',
  'application/x-java-archive',
  'application/vnd.android.package-archive',
]);

// Extensions we support reading
const READABLE_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc',
  '.txt', '.csv', '.md', '.rtf', '.html', '.htm',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
  '.mp3', '.mp4', '.wav', '.m4a', '.ogg', '.aac', '.mov', '.avi', '.mkv',
]);

function scanAttachment(filename, mimeType) {
  const ext = extname(filename).toLowerCase();

  // Hard block
  if (BLOCKED_EXTENSIONS.has(ext) || BLOCKED_MIME.has(mimeType)) {
    return {
      safe: false,
      blocked: true,
      reason: `Blocked file type — "${filename}" (${ext || mimeType}) cannot be downloaded. This type of file can contain malware.`
    };
  }

  // MIME / extension mismatch — suspicious
  const extSafe = READABLE_EXTENSIONS.has(ext);
  const mimeSafe = !mimeType.includes('executable') && !mimeType.includes('script') && !mimeType.includes('x-ms');

  if (!extSafe && ext) {
    return {
      safe: false,
      blocked: false,
      reason: `Unrecognised file type "${ext}" — Mailbridge doesn't know how to safely read this file.`
    };
  }

  if (!mimeSafe) {
    return {
      safe: false,
      blocked: false,
      reason: `Suspicious MIME type (${mimeType}) — this file may not be what it claims to be.`
    };
  }

  // Extension says one thing, MIME says another — flag it
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);
  const audioExts = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.mp4', '.mov', '.avi']);
  const docExts   = new Set(['.pdf', '.docx', '.doc', '.txt', '.csv', '.md', '.rtf']);

  const mimeIsImage = mimeType.startsWith('image/');
  const mimeIsAudio = mimeType.startsWith('audio/') || mimeType.startsWith('video/');
  const mimeIsDoc   = mimeType.startsWith('application/') || mimeType.startsWith('text/');

  const extGroup = imageExts.has(ext) ? 'image' : audioExts.has(ext) ? 'audio' : docExts.has(ext) ? 'doc' : null;
  const mimeGroup = mimeIsImage ? 'image' : mimeIsAudio ? 'audio' : mimeIsDoc ? 'doc' : null;

  if (extGroup && mimeGroup && extGroup !== mimeGroup) {
    return {
      safe: false,
      blocked: false,
      reason: `Mismatch — file is named "${filename}" but its declared type is ${mimeType}. This is suspicious.`
    };
  }

  return { safe: true, blocked: false, reason: null };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function findAttachments(node, parts = []) {
  if (!node) return parts;

  const disp = node.disposition?.value?.toLowerCase();
  const filename =
    node.disposition?.params?.filename ||
    node.disposition?.params?.name ||
    node.parameters?.name;

  const isAttachment = disp === 'attachment' || (disp === 'inline' && filename);

  if (isAttachment && node.type && node.subtype) {
    const mimeType = `${node.type}/${node.subtype}`.toLowerCase();
    const name = filename || `attachment.${node.subtype}`;
    const scan = scanAttachment(name, mimeType);
    parts.push({
      partId: node.part || '1',
      filename: name,
      mimeType,
      size: node.size || 0,
      size_kb: ((node.size || 0) / 1024).toFixed(1),
      safety: scan.safe ? '✅ Safe' : scan.blocked ? '🚫 Blocked' : '⚠️ Warning',
      safety_note: scan.reason || null
    });
  }

  if (node.childNodes) {
    for (const child of node.childNodes) findAttachments(child, parts);
  }

  return parts;
}

// ── Tools ────────────────────────────────────────────────────────────────────

export function registerAttachmentTools(server) {

  // get_attachments — lists attachments with safety status, no download
  server.tool(
    'get_attachments',
    'List all attachments on an email with filename, size, type, and safety status. No content is downloaded — call read_attachment separately after user confirms.',
    {
      uid: z.number().describe('Email UID'),
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ uid, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);
      const msg = await client.fetchOne(String(uid), { bodyStructure: true }, { uid: true });
      await client.logout();

      if (!msg) return { content: [{ type: 'text', text: `No email found with UID ${uid} in ${folder}` }] };

      const attachments = findAttachments(msg.bodyStructure);
      if (!attachments.length) return { content: [{ type: 'text', text: 'This email has no attachments.' }] };

      return { content: [{ type: 'text', text: JSON.stringify(attachments, null, 2) }] };
    }
  );

  // read_attachment — requires user permission (no readOnlyHint), runs safety check before download
  server.tool(
    'read_attachment',
    'Download and read an attachment after the user has approved. Runs a safety check first — blocked files are never downloaded. Extracts text from PDF/DOCX, displays images inline, saves audio/video for transcription plugins.',
    {
      uid: z.number().describe('Email UID'),
      part_id: z.string().describe('Part ID from get_attachments'),
      folder: z.string().default('INBOX')
    },
    { destructiveHint: false }, // no readOnlyHint — Claude Cowork will ask user to approve
    async ({ uid, part_id, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      const msg = await client.fetchOne(String(uid), { bodyStructure: true }, { uid: true });
      const attachments = findAttachments(msg.bodyStructure);
      const meta = attachments.find(a => a.partId === part_id);

      if (!meta) {
        await client.logout();
        return { content: [{ type: 'text', text: `No attachment found with part ID "${part_id}". Run get_attachments first.` }] };
      }

      // ── Safety check — before any download ──────────────────────────────────
      const scan = scanAttachment(meta.filename, meta.mimeType);
      if (scan.blocked) {
        await client.logout();
        return { content: [{ type: 'text', text: `🚫 Download blocked — ${scan.reason}` }] };
      }
      if (!scan.safe) {
        await client.logout();
        return { content: [{ type: 'text', text: `⚠️ Download stopped — ${scan.reason}\n\nIf you're sure this file is safe, let me know and I won't open it automatically — you can save it manually instead.` }] };
      }

      // ── Size check ───────────────────────────────────────────────────────────
      if (meta.size > SIZE_LIMIT_BYTES) {
        await client.logout();
        return { content: [{ type: 'text', text: `Attachment "${meta.filename}" is too large (${(meta.size / 1024 / 1024).toFixed(1)} MB). Maximum supported size is 20 MB.` }] };
      }

      // ── Download ─────────────────────────────────────────────────────────────
      const download = await client.download(String(uid), part_id, { uid: true });
      const buffer = await streamToBuffer(download.content);
      await client.logout();

      const { mimeType, filename } = meta;

      // Plain text
      if (mimeType.startsWith('text/')) {
        return { content: [{ type: 'text', text: `**${filename}**\n\n${buffer.toString('utf8')}` }] };
      }

      // PDF
      if (mimeType === 'application/pdf') {
        try {
          const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
          const data = await pdfParse(buffer);
          return { content: [{ type: 'text', text: `**${filename}** (${data.numpages} page${data.numpages !== 1 ? 's' : ''})\n\n${data.text.trim()}` }] };
        } catch (err) {
          return { content: [{ type: 'text', text: `Could not extract text from "${filename}": ${err.message}` }] };
        }
      }

      // DOCX
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ buffer });
          return { content: [{ type: 'text', text: `**${filename}**\n\n${result.value.trim()}` }] };
        } catch (err) {
          return { content: [{ type: 'text', text: `Could not extract text from "${filename}": ${err.message}` }] };
        }
      }

      // Images — Claude sees them inline
      if (mimeType.startsWith('image/')) {
        return {
          content: [
            { type: 'text', text: `**${filename}**` },
            { type: 'image', data: buffer.toString('base64'), mimeType }
          ]
        };
      }

      // Audio / Video — save to temp for transcription plugins
      if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
        const tmpPath = join(tmpdir(), filename);
        writeFileSync(tmpPath, buffer);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              filename,
              mimeType,
              size_mb: (buffer.length / 1024 / 1024).toFixed(2),
              saved_to: tmpPath,
              note: 'File saved to temp path. If you have a transcription plugin connected (e.g. ElevenLabs, Whisper), pass this path to it. Otherwise, let the user know a transcription plugin is needed.'
            }, null, 2)
          }]
        };
      }

      // Fallback
      return {
        content: [{
          type: 'text',
          text: `"${filename}" (${mimeType}, ${(buffer.length / 1024).toFixed(1)} KB) — this file type cannot be displayed directly.`
        }]
      };
    }
  );
}
