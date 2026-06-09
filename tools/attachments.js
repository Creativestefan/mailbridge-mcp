import { z } from 'zod';
import { createImapClient } from '../utils/imap.js';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const SIZE_LIMIT_BYTES = 20 * 1024 * 1024; // 20MB

// Collect a readable stream into a Buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

// Recursively walk IMAP bodyStructure to find attachments
function findAttachments(node, parts = []) {
  if (!node) return parts;

  const disp = node.disposition?.value?.toLowerCase();
  const filename =
    node.disposition?.params?.filename ||
    node.disposition?.params?.name ||
    node.parameters?.name;

  const isAttachment = disp === 'attachment' || (disp === 'inline' && filename);

  if (isAttachment && node.type && node.subtype) {
    parts.push({
      partId: node.part || '1',
      filename: filename || `attachment.${node.subtype}`,
      mimeType: `${node.type}/${node.subtype}`.toLowerCase(),
      size: node.size || 0
    });
  }

  if (node.childNodes) {
    for (const child of node.childNodes) findAttachments(child, parts);
  }

  return parts;
}

export function registerAttachmentTools(server) {

  server.tool(
    'get_attachments',
    'List all attachments on a specific email. Returns filename, MIME type, size, and part ID needed to download.',
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

  server.tool(
    'read_attachment',
    'Download and read an email attachment. Extracts text from PDF and DOCX. Returns image data for JPG/PNG so Claude can view it. Saves audio/video to a temp path for transcription plugins.',
    {
      uid: z.number().describe('Email UID'),
      part_id: z.string().describe('Part ID from get_attachments'),
      folder: z.string().default('INBOX')
    },
    { readOnlyHint: true },
    async ({ uid, part_id, folder }) => {
      const client = await createImapClient();
      await client.connect();
      await client.mailboxOpen(folder);

      // Get metadata from body structure
      const msg = await client.fetchOne(String(uid), { bodyStructure: true }, { uid: true });
      const attachments = findAttachments(msg.bodyStructure);
      const meta = attachments.find(a => a.partId === part_id);

      if (!meta) {
        await client.logout();
        return { content: [{ type: 'text', text: `No attachment found with part ID "${part_id}". Run get_attachments to see valid part IDs.` }] };
      }

      if (meta.size > SIZE_LIMIT_BYTES) {
        await client.logout();
        return { content: [{ type: 'text', text: `Attachment "${meta.filename}" is too large (${(meta.size / 1024 / 1024).toFixed(1)} MB). Maximum supported size is 20 MB.` }] };
      }

      // Download
      const download = await client.download(String(uid), part_id, { uid: true });
      const buffer = await streamToBuffer(download.content);
      await client.logout();

      const { mimeType, filename } = meta;

      // ── Plain text ──────────────────────────────────────────────────────────
      if (mimeType.startsWith('text/')) {
        return { content: [{ type: 'text', text: `**${filename}**\n\n${buffer.toString('utf8')}` }] };
      }

      // ── PDF ─────────────────────────────────────────────────────────────────
      if (mimeType === 'application/pdf') {
        try {
          const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
          const data = await pdfParse(buffer);
          return { content: [{ type: 'text', text: `**${filename}** (${data.numpages} page${data.numpages !== 1 ? 's' : ''})\n\n${data.text.trim()}` }] };
        } catch (err) {
          return { content: [{ type: 'text', text: `Could not extract text from "${filename}": ${err.message}` }] };
        }
      }

      // ── DOCX ────────────────────────────────────────────────────────────────
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const mammoth = await import('mammoth');
          const result = await mammoth.extractRawText({ buffer });
          return { content: [{ type: 'text', text: `**${filename}**\n\n${result.value.trim()}` }] };
        } catch (err) {
          return { content: [{ type: 'text', text: `Could not extract text from "${filename}": ${err.message}` }] };
        }
      }

      // ── Images — Claude can see these natively ──────────────────────────────
      if (mimeType.startsWith('image/')) {
        return {
          content: [
            { type: 'text', text: `**${filename}**` },
            { type: 'image', data: buffer.toString('base64'), mimeType }
          ]
        };
      }

      // ── Audio / Video — save to temp for transcription plugins ──────────────
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
              note: 'File saved to temp path. If you have a transcription plugin connected (e.g. ElevenLabs, Whisper), pass this path to it to transcribe the content. Otherwise, let the user know a transcription plugin is needed.'
            }, null, 2)
          }]
        };
      }

      // ── Unknown / binary ────────────────────────────────────────────────────
      return {
        content: [{
          type: 'text',
          text: `"${filename}" (${mimeType}, ${(buffer.length / 1024).toFixed(1)} KB) — this file type cannot be displayed directly.`
        }]
      };
    }
  );
}
