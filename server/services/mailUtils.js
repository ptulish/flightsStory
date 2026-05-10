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
    .replace(/\r\n/g, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim().replace(/[ \t]{2,}/g, ' '))
    .filter(Boolean)
    .join('\n')
    .trim();
}

/** Remove top-level RFC822 headers from raw source to avoid parsing email sent date as flight date. */
export function stripRfc822Headers(raw) {
  if (!raw) return '';
  const s = String(raw);
  const split = s.match(/\r?\n\r?\n/);
  if (!split?.index) return s;
  const head = s.slice(0, split.index);
  if (!/^\s*(from|to|subject|date|message-id|mime-version):/im.test(head)) return s;
  return s.slice(split.index + split[0].length);
}
