import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function resolveKeyMaterial() {
  const fromEnv = process.env.CONTACT_ENCRYPTION_KEY || process.env.AJUSTECH_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    return fromEnv;
  }
  // Ephemeral key for local/dev — messages stay encrypted in memory only for this process.
  return randomBytes(32).toString('hex');
}

const keyMaterial = resolveKeyMaterial();
const KEY = scryptSync(keyMaterial, 'ajustech-contact-v1', 32);
const IP_PEPPER = createHash('sha256').update(`ip:${keyMaterial}`).digest();

export function encryptText(plain) {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptText(payload) {
  const [ivB64, tagB64, dataB64] = String(payload).split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid ciphertext');
  }
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function hashIp(ip) {
  return createHmac('sha256', IP_PEPPER).update(String(ip)).digest('base64url');
}

export function sanitizeText(value, maxLen) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export const encryptionConfigured = Boolean(
  process.env.CONTACT_ENCRYPTION_KEY || process.env.AJUSTECH_SECRET,
);
