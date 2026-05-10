import crypto from 'node:crypto';

export function toMessageHash(source, externalId, subject, date) {
  return crypto
    .createHash('sha1')
    .update(`${source}:${externalId || ''}:${subject || ''}:${date || ''}`)
    .digest('hex');
}

export function decodeGmailBody(part) {
  if (!part) return '';
  if (part.parts?.length) {
    return part.parts.map((p) => decodeGmailBody(p)).filter(Boolean).join('\n');
  }
  if (!part.body?.data) return '';
  try {
    return Buffer.from(part.body.data, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export function toPlainText(value) {
  if (!value) return '';
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
